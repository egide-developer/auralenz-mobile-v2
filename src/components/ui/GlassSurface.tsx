import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Radius } from "../../theme/spacing";

export type GlassIntensity = "soft" | "regular" | "strong";

const INTENSITY: Record<GlassIntensity, number> = {
  soft: 18,
  regular: 32,
  strong: 48,
};

interface GlassSurfaceProps {
  children?: React.ReactNode;
  intensity?: GlassIntensity;
  /** Draw the hairline border that separates the glass from content behind it. */
  bordered?: boolean;
  /** Which edge the border sits on - most chrome only needs one. */
  borderEdge?: "all" | "bottom" | "top";
  radius?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: "none" | "auto" | "box-none" | "box-only";
}

/**
 * The one place that decides what "glass" means in this app: a native blur
 * (BlurView - real UIVisualEffectView on iOS, a blur renderer on Android,
 * not just a translucent rgba fill) plus a thin tint so content underneath
 * never looks washed out, and a hairline edge so the surface reads as a
 * distinct layer. Use this instead of hand-rolling rgba backgrounds - that's
 * how the app ended up with BlurView imported in places but never rendered.
 */
export function GlassSurface({
  children,
  intensity = "regular",
  bordered = true,
  borderEdge = "all",
  radius,
  style,
  pointerEvents,
}: GlassSurfaceProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const c = isDark ? Colors.dark : Colors.light;

  const borderStyle: ViewStyle =
    borderEdge === "all"
      ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.glassBorder }
      : borderEdge === "bottom"
      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.glassBorder }
      : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.glassBorder };

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        { borderRadius: radius ?? Radius.lg, overflow: "hidden" },
        bordered && borderStyle,
        style,
      ]}
    >
      <BlurView
        intensity={INTENSITY[intensity]}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      {/* BlurView alone can look identical across light/dark in some Android
          renderers - the tint keeps the surface legibly "ours" either way. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glass, opacity: isDark ? 0.55 : 0.45 }]} />
      {children}
    </View>
  );
}
