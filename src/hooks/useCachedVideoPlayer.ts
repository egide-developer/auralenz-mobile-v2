// Wraps expo-video's useVideoPlayer so every video screen plays from a
// locally cached file instead of re-buffering the remote URL each time.
// Same (player) => {...} setup-callback signature as useVideoPlayer, so
// call sites only need to swap the import and hook name.
import { useEffect, useState } from "react";
import { useVideoPlayer, VideoPlayer } from "expo-video";
import { getCachedVideoUri } from "../utils/videoCache";

export function useCachedVideoPlayer(
  remoteUrl: string | null | undefined,
  setup?: (player: VideoPlayer) => void
) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!remoteUrl) {
      setResolvedUri(null);
      return;
    }
    getCachedVideoUri(remoteUrl).then((uri) => {
      if (!cancelled) setResolvedUri(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [remoteUrl]);

  const player = useVideoPlayer(resolvedUri, setup);

  return { player, ready: !!resolvedUri };
}
