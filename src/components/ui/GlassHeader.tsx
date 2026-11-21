import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Typography } from "../../theme/typography";
import { Spacing } from "../../theme/spacing";
import { GlassSurface } from "./GlassSurface";

interface GlassHeaderProps {
  title?: string;
  /**
   * True once the screen has scrolled past the threshold - the header
   * switches from fully transparent (content shows through, iOS large-title
   * style) to a blurred glass bar with a hairline bottom edge. Pass this
   * from a scroll handler; see useHeaderBlurOnScroll.
   */
  blurred?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Standard header height used across tab screens, excluding the safe area inset. */
export const HEADER_CONTENT_HEIGHT = 52;

/**
 * Shared chrome for every top-level screen header: transparent over content
 * until the user scrolls, then a real blur (not a flat color swap) slides
 * in behind it - the one pattern the Profile screen had on its own, now
 * available everywhere so Feed/Explore/Messages/Settings/Live Rooms don't
 * each reinvent a slightly different header.
 */
export function GlassHeader({ title, blurred = false, left, right, style }: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const c = isDark ? Colors.dark : Colors.light;

  const content = (
    <View style={[styles.row, { height: HEADER_CONTENT_HEIGHT }]}>
      <View style={styles.side}>{left}</View>
      {title ? (
        <Text style={[Typography.h4, styles.title, { color: c.foreground }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titleSlot} />
      )}
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );

  if (!blurred) {
    return (
      <View style={[{ paddingTop: insets.top }, style]} pointerEvents="box-none">
        {content}
      </View>
    );
  }

  return (
    <GlassSurface
      intensity="regular"
      bordered
      borderEdge="bottom"
      radius={0}
      style={[{ paddingTop: insets.top }, style]}
    >
      {content}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
  },
  side: {
    minWidth: 40,
    flexDirection: "row",
    alignItems: "center",
  },
  sideRight: {
    justifyContent: "flex-end",
  },
  title: {
    flex: 1,
    textAlign: "center",
  },
  titleSlot: {
    flex: 1,
  },
});
