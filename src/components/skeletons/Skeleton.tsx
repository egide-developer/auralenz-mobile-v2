// AuraLenz — Skeleton primitives
// Base shimmering placeholder using Reanimated UI-thread animation

import React from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeStore } from "../../stores/themeStore";
import { SkeletonColors } from "../../theme/colors";
import { Gap, Radius, Spacing } from "../../theme/spacing";

export type SkeletonTone = "default" | "overlay";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  round?: boolean;
  aspectRatio?: number;
  tone?: SkeletonTone;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = Radius.md,
  style,
  round = false,
  aspectRatio,
  tone = "default",
}: SkeletonProps) {
  const colors = useSkeletonColors();
  const baseColor = tone === "overlay" ? colors.overlayBase : colors.base;
  const highlightColor =
    tone === "overlay" ? colors.overlayHighlight : colors.highlight;

  const translateX = useSharedValue(-50);

  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(50, { duration: 1600, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return { transform: [{ translateX: `${translateX.value}%` }] };
  });

  const r = round ? Radius.pill : borderRadius;

  return (
    <Animated.View
      style={[
        styles.container,
        { width, height, borderRadius: r, aspectRatio, backgroundColor: baseColor },
        style,
      ]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.mask} pointerEvents="none">
        <Animated.View style={[styles.gradientTrack, animatedStyle]}>
          <LinearGradient
            colors={[baseColor, highlightColor, baseColor]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export function useSkeletonColors() {
  const isDark = useThemeStore((state) => state.isDark);
  return isDark ? SkeletonColors.dark : SkeletonColors.light;
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  textLines: {
    width: "100%",
    flexDirection: "column",
  },
  mask: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  gradientTrack: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "200%",
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },
});

export function SkeletonCircle({
  size = 40,
  style,
  tone,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
  tone?: SkeletonTone;
}) {
  return <Skeleton width={size} height={size} round style={style} tone={tone} />;
}

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  width?: number | string | (number | string)[];
  style?: StyleProp<ViewStyle>;
  lineGap?: number;
  lastLineWidth?: number | string;
  tone?: SkeletonTone;
}

export function SkeletonText({
  lines = 1,
  lineHeight = 20,
  width = "100%",
  style,
  lineGap = Gap.sm,
  lastLineWidth = "62%",
  tone,
}: SkeletonTextProps) {
  const getWidth = (i: number) => {
    if (Array.isArray(width)) {
      return width[Math.min(i, width.length - 1)];
    }
    return i === lines - 1 && lines > 1 ? lastLineWidth : width;
  };

  return (
    <View style={[styles.textLines, { gap: lineGap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={getWidth(i)}
          height={Math.max(lineHeight - Spacing.xs, Spacing.sm)}
          borderRadius={Radius.sm}
          tone={tone}
        />
      ))}
    </View>
  );
}

interface SkeletonImageProps {
  width?: number | string;
  height: number;
  aspectRatio?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  tone?: SkeletonTone;
}

export function SkeletonImage({
  width = "100%",
  height,
  aspectRatio,
  borderRadius = Radius.md,
  style,
  tone,
}: SkeletonImageProps) {
  return (
    <Skeleton
      width={width}
      height={height}
      aspectRatio={aspectRatio}
      borderRadius={borderRadius}
      style={style}
      tone={tone}
    />
  );
}