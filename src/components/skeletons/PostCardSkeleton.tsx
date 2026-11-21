import React from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Gap, IconSize, Spacing } from "../../theme/spacing";
import { useSkeletonColors, Skeleton, SkeletonCircle, SkeletonText, SkeletonImage } from "./Skeleton";

const MIN_MEDIA_HEIGHT = 240;

export function PostCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { width, height } = useWindowDimensions();
  const colors = useSkeletonColors();
  const mediaHeight = Math.max(
    MIN_MEDIA_HEIGHT,
    Math.min(width, height * 0.75),
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderBottomColor: colors.divider },
        style,
      ]}
      accessible={false}
    >
      <View style={styles.postHeader}>
        <SkeletonCircle size={36} />
        <View style={styles.postMeta}>
          <SkeletonText width="42%" lineHeight={Spacing.lg} />
          <SkeletonText width="28%" lineHeight={Spacing.md + Gap.xs} />
        </View>
        <SkeletonCircle size={IconSize.md} />
      </View>

      <SkeletonImage
        width="100%"
        height={mediaHeight}
        borderRadius={0}
        style={styles.media}
      />

      <SkeletonText
        lines={2}
        width={["84%", "56%"]}
        lineHeight={Spacing.lg}
        style={styles.caption}
      />

      <View style={styles.actions}>
        {([true, true, false, false] as const).map((hasCount, index) => (
          <View key={index} style={styles.action}>
            <SkeletonCircle size={IconSize.md} />
            {hasCount ? (
              <Skeleton width={Spacing.xl} height={Spacing.xs} />
            ) : null}
          </View>
        ))}
        <View style={styles.actionSpacer} />
        <SkeletonCircle size={IconSize.md} />
      </View>
    </View>
  );
}

export function PostCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton key={index} />
      )) as React.ReactElement[]}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  postMeta: {
    flex: 1,
    gap: Gap.xs,
    marginLeft: Gap.md,
  },
  media: {
    marginHorizontal: -Spacing.base,
    marginBottom: Spacing.md,
  },
  caption: {
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.lg,
    marginTop: Gap.xs,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.xs,
  },
  actionSpacer: {
    flex: 1,
  },
});
