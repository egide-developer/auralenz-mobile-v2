/**
 * Mirrors the shape validated by backend/services/videoRenderService.js.
 * Keep the two in sync — the server clamps and re-validates everything here,
 * so a drift shows up as a silently ignored edit rather than an error.
 */

export const FILTER_IDS = ["none", "warm", "cool", "mono", "vivid", "fade", "dramatic"] as const;
export type FilterId = (typeof FILTER_IDS)[number];

export const SPEEDS = [0.5, 1, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export interface TextOverlay {
  id: string;
  kind: "text";
  text: string;
  /** Centre of the overlay, as a fraction of the frame (0..1). */
  x: number;
  y: number;
  scale: number;
  color: string;
}

export interface StickerOverlay {
  id: string;
  kind: "sticker";
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

export type Overlay = TextOverlay | StickerOverlay;

export interface AudioTrack {
  url: string;
  title?: string;
  startMs: number;
  volume: number;
}

export interface EditSpec {
  version: 1;
  trim?: { startMs: number; endMs: number };
  speed: Speed;
  filter: FilterId;
  mute: boolean;
  audio?: AudioTrack;
  overlays: Overlay[];
}

export const emptySpec = (): EditSpec => ({
  version: 1,
  speed: 1,
  filter: "none",
  mute: false,
  overlays: [],
});

/** True when the spec would leave the source untouched, so upload can skip the render entirely. */
export function isNoOpSpec(spec: EditSpec, sourceDurationMs?: number): boolean {
  const trimIsWholeClip =
    !spec.trim ||
    (spec.trim.startMs <= 0 && (sourceDurationMs === undefined || spec.trim.endMs >= sourceDurationMs - 50));

  return (
    trimIsWholeClip &&
    spec.speed === 1 &&
    spec.filter === "none" &&
    !spec.mute &&
    !spec.audio &&
    spec.overlays.length === 0
  );
}

/**
 * Strips client-only fields (ids) before upload. The server keys overlays
 * positionally and rejects anything it doesn't recognise.
 */
export function serializeSpec(spec: EditSpec) {
  return {
    version: 1 as const,
    trim: spec.trim,
    speed: spec.speed,
    filter: spec.filter,
    mute: spec.mute,
    audio: spec.audio ? { url: spec.audio.url, startMs: spec.audio.startMs, volume: spec.audio.volume } : undefined,
    overlays: spec.overlays.map((o) =>
      o.kind === "text"
        ? { kind: "text", text: o.text, x: o.x, y: o.y, scale: o.scale, color: o.color }
        : { kind: "sticker", emoji: o.emoji, x: o.x, y: o.y, scale: o.scale }
    ),
  };
}

/**
 * Approximate on-device previews of the server's ffmpeg filter presets.
 *
 * These are a translucent tint plus an opacity hint, not a real colour
 * transform: expo-video has no filter pipeline, and adding a GPU shader
 * library for a preview is not worth the build weight. The exported file is
 * graded properly by ffmpeg, so this conveys intent rather than matching
 * the result exactly — the one place preview and export knowingly diverge.
 */
export const FILTER_PREVIEW: Record<FilterId, { label: string; tint: string; opacity: number }> = {
  none: { label: "None", tint: "transparent", opacity: 0 },
  warm: { label: "Warm", tint: "#FF9A3C", opacity: 0.16 },
  cool: { label: "Cool", tint: "#3C7DFF", opacity: 0.16 },
  mono: { label: "Mono", tint: "#8A8A8A", opacity: 0.45 },
  vivid: { label: "Vivid", tint: "#FF2D95", opacity: 0.1 },
  fade: { label: "Fade", tint: "#F5F0E8", opacity: 0.22 },
  dramatic: { label: "Drama", tint: "#101018", opacity: 0.28 },
};
