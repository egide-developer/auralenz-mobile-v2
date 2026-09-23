// Local disk cache for remote videos (feed posts, story videos, reels,
// highlights). expo-video has no built-in disk cache the way expo-image
// does, so every screen re-buffered the same remote URL on every visit.
// This downloads a video once to app cache storage and hands back a local
// file:// URI for playback; a size-capped LRU manifest keeps the cache from
// growing unbounded on real devices.
//
// Uses expo-file-system's SDK 54+ File/Directory API (the legacy
// FileSystem.cacheDirectory/downloadAsync functions were removed in the
// version this app is on).
import { File, Directory, Paths } from "expo-file-system";

const cacheDir = new Directory(Paths.cache, "video-cache");
const MAX_CACHE_BYTES = 300 * 1024 * 1024; // 300MB

interface ManifestEntry {
  hash: string;
  ext: string;
  url: string;
  sizeBytes: number;
  lastAccessedAt: number;
}

type Manifest = Record<string, ManifestEntry>;

let manifestCache: Manifest | null = null;
const inFlight = new Map<string, Promise<string>>();

function ensureDir() {
  if (!cacheDir.exists) {
    cacheDir.create({ intermediates: true, idempotent: true });
  }
}

function manifestFile(): File {
  return new File(cacheDir, "manifest.json");
}

function loadManifest(): Manifest {
  if (manifestCache) return manifestCache;
  ensureDir();
  try {
    const f = manifestFile();
    if (f.exists) {
      manifestCache = JSON.parse(f.textSync());
      return manifestCache!;
    }
  } catch {
    // Corrupt/missing manifest — start fresh rather than blocking playback.
  }
  manifestCache = {};
  return manifestCache;
}

function saveManifest(manifest: Manifest) {
  manifestCache = manifest;
  try {
    manifestFile().write(JSON.stringify(manifest));
  } catch {
    // Non-fatal — worst case the manifest is stale until the next write.
  }
}

// djb2 — fast, good-enough distribution for cache filenames; this isn't a
// security context, just needs stable per-URL uniqueness.
function hashUrl(url: string): string {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 33) ^ url.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = /\.([a-zA-Z0-9]{2,4})$/.exec(pathname);
    if (match) return match[1].toLowerCase();
  } catch {
    // Fall through to default below.
  }
  return "mp4";
}

function evictIfOverCap(manifest: Manifest) {
  const entries = Object.values(manifest);
  let total = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
  if (total <= MAX_CACHE_BYTES) return;

  const oldestFirst = entries.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
  for (const entry of oldestFirst) {
    if (total <= MAX_CACHE_BYTES) break;
    try {
      new File(cacheDir, entry.hash + "." + entry.ext).delete();
    } catch {
      // Ignore — file may already be gone.
    }
    delete manifest[entry.hash];
    total -= entry.sizeBytes;
  }
  saveManifest(manifest);
}

async function downloadAndRegister(remoteUrl: string): Promise<string> {
  ensureDir();
  const hash = hashUrl(remoteUrl);
  const ext = getExtension(remoteUrl);
  const destination = new File(cacheDir, `${hash}.${ext}`);

  if (destination.exists) destination.delete();
  const downloaded = await File.downloadFileAsync(remoteUrl, destination, { idempotent: true });

  const manifest = loadManifest();
  manifest[hash] = { hash, ext, url: remoteUrl, sizeBytes: downloaded.size, lastAccessedAt: Date.now() };
  saveManifest(manifest);
  evictIfOverCap(manifest);

  return downloaded.uri;
}

/**
 * Resolves a remote video URL to a local cached file:// URI, downloading it
 * on first request. Falls back to the remote URL on any failure so playback
 * still works uncached rather than breaking.
 */
export async function getCachedVideoUri(remoteUrl: string): Promise<string> {
  if (!remoteUrl) return remoteUrl;

  try {
    const manifest = loadManifest();
    const hash = hashUrl(remoteUrl);
    const existing = manifest[hash];
    if (existing) {
      const file = new File(cacheDir, `${existing.hash}.${existing.ext}`);
      if (file.exists) {
        existing.lastAccessedAt = Date.now();
        saveManifest(manifest);
        return file.uri;
      }
      // Manifest says cached but the file is gone — fall through to re-download.
      delete manifest[hash];
    }

    const pending = inFlight.get(remoteUrl);
    if (pending) return pending;

    const promise = downloadAndRegister(remoteUrl).finally(() => {
      inFlight.delete(remoteUrl);
    });
    inFlight.set(remoteUrl, promise);
    return await promise;
  } catch {
    return remoteUrl;
  }
}

/**
 * Fire-and-forget prefetch — used to warm the cache for the next story
 * before the user swipes to it.
 */
export function prefetchVideo(remoteUrl: string | undefined | null): void {
  if (!remoteUrl) return;
  getCachedVideoUri(remoteUrl).catch(() => {});
}
