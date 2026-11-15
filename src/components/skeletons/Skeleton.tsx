// AuraLenz — Skeleton primitives
// Base shimmering placeholder using Reanimated UI-thread animation

import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeStore } from "../../stores/themeStore";
import { SkeletonColors } from "../../theme/colors";
import { Radius, Spacing } from "../../theme/spacing";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  round?: boolean; // makes it a circle
  aspectRatio?: number;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = Radius.md,
  style,
  round = false,
  aspectRatio,
}: SkeletonProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? SkeletonColors.dark : SkeletonColors.light;

  const translateX = useSharedValue(-1.5);

  React.useEffect(() => {
    translateX.value = withTiming(-1.5, { duration: 0, easing: Easing.linear });
    translateX.value = withTiming(1.5, {
      duration: 1200,
      easing: Easing.linear,
    });
  }, []);

  // Restart loop
  const animatedStyle = useAnimatedStyle(() => {
    if (translateX.value >= 1.5) {
      translateX.value = withTiming(-1.5, { duration: 0, easing: Easing.linear });
      translateX.value = withTiming(1.5, {
        duration: 1200,
        easing: Easing.linear,
      });
    }
    return { transform: [{ translateX: `${translateX.value * 100}%` }] };
  }, []);

  const r = round ? 9999 : borderRadius;

  return (
    <Animated.View
      style={[
        styles.container,
        { width, height, borderRadius: r, aspectRatio },
        style,
        animatedStyle,
      ]}
    >
      <View style={styles.mask} pointerEvents="none">
        <LinearGradient
          colors={[colors.base, colors.highlight, colors.base]}
          style={styles.gradient}
          start={{ x: -1.5, y: 0 }}
          end={{ x: 1.5, y: 0 }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  mask: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    width: "300%",
  },
});

export function SkeletonCircle({
  size = 40,
  style,
}: { size?: number; style?: any }) {
  return <Skeleton width={size} height={size} round style={style} />;
}

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  width?: number | string | (number | string)[];
  style?: any;
  lineGap?: number;
  lastLineWidth?: number | string;
}

export function SkeletonText({
  lines = 1,
  lineHeight = 20,
  width = "100%",
  style,
  lineGap = 8,
  lastLineWidth = "60%",
}: SkeletonTextProps) {
  const getWidth = (i: number) => {
    if (Array.isArray(width)) {
      return width[Math.min(i, width.length - 1)];
    }
    return i === lines - 1 && lines > 1 ? lastLineWidth : width;
  };

  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={getWidth(i)}
          height={lineHeight - 4}
          borderRadius={Radius.sm}
          style={{ marginBottom: i === lines - 1 ? 0 : lineGap }}
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
  style?: any;
}

export function SkeletonImage({
  width = "100%",
  height,
  aspectRatio,
  borderRadius = Radius.md,
  style,
}: SkeletonImageProps) {
  return (
    <Skeleton
      width={width}
      height={height}
      aspectRatio={aspectRatio}
      borderRadius={borderRadius}
      style={style}
    />
  );
}