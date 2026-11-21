import { useCallback, useState } from "react";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";

/**
 * Drives GlassHeader's `blurred` prop from a ScrollView/FlatList's
 * onScroll - crosses to true once the user has scrolled past `threshold`,
 * back to false near the top, so the header starts transparent (content
 * visible through it) and picks up blur only once there's something to
 * separate it from.
 */
export function useHeaderBlurOnScroll(threshold = 8) {
  const [blurred, setBlurred] = useState(false);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setBlurred((prev) => (prev ? y > threshold / 2 : y > threshold));
    },
    [threshold],
  );

  return { blurred, onScroll };
}
