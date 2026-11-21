import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarSize, Gap, IconSize, Spacing } from "../../theme/spacing";
import {
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useSkeletonColors,
} from "./Skeleton";

export function ReelSkeleton() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = useSkeletonColors();

  return (
    <View
      style={[
        styles.reel,
        { width, height, backgroundColor: colors.media },
      ]}
      accessible={false}
    >
      <Skeleton
        width={width}
        height={height}
        borderRadius={0}
        style={styles.media}
      />

      <View
        style={[
          styles.bottomOverlay,
          { bottom: insets.bottom + Spacing["4xl"] + Spacing.md },
        ]}
      >
        <View style={styles.bottomInfo}>
          <View style={styles.reelHeader}>
            <SkeletonCircle size={AvatarSize.sm} tone="overlay" />
            <View style={styles.reelMeta}>
              <SkeletonText width="62%" lineHeight={Spacing.lg} tone="overlay" />
              <SkeletonText width="42%" lineHeight={Spacing.sm} tone="overlay" />
            </View>
          </View>
          <SkeletonText
            lines={2}
            width={["84%", "56%"]}
            lineHeight={Spacing.lg}
            tone="overlay"
          />
        </View>

        <View style={styles.actions}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={styles.action}>
              <SkeletonCircle size={IconSize.lg} tone="overlay" />
              <Skeleton width={Spacing.xl} height={Spacing.xs} tone="overlay" />
            </View>
          )) as React.ReactElement[]}
        </View>
      </View>
    </View>
  );
}

export function ReelSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list} accessible={false}>
      {Array.from({ length: count }).map((_, index) => (
        <ReelSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reel: {
    overflow: "hidden",
  },
  media: {
    ...StyleSheet.absoluteFill,
  },
  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.base,
  },
  bottomInfo: {
    flex: 1,
    paddingRight: Gap.md,
  },
  reelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.sm,
    marginBottom: Spacing.md,
  },
  reelMeta: {
    flex: 1,
    gap: Gap.xs,
  },
  actions: {
    alignItems: "center",
    gap: Spacing.md,
  },
  action: {
    alignItems: "center",
    gap: Gap.xs,
  },
  list: {
    flex: 1,
  },
});
