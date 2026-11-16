import React from "react";
import { StyleSheet, View } from "react-native";
import { Gap, IconSize, Radius, Spacing } from "../../theme/spacing";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";

export function CommentSkeleton({ depth = 0 }: { depth?: number }) {
  return (
    <View
      style={[styles.comment, depth > 0 && styles.reply]}
      accessible={false}
    >
      <SkeletonCircle size={Spacing["2xl"] - Gap.xs} />
      <View style={styles.commentBody}>
        <Skeleton width="44%" height={Spacing.md + Gap.xs} />
        <SkeletonText
          lines={2}
          width={["88%", "58%"]}
          lineHeight={Spacing.lg}
          style={styles.commentText}
        />
        <View style={styles.commentActions}>
          <Skeleton width={Spacing["2xl"]} height={Spacing.sm} />
          {depth === 0 ? (
            <Skeleton width={Spacing.xl} height={Spacing.sm} />
          ) : null}
        </View>
      </View>
      <View style={styles.likes}>
        <SkeletonCircle size={IconSize.sm} />
        <Skeleton
          width={Spacing.md}
          height={Spacing.xs}
          borderRadius={Radius.xs}
        />
      </View>
    </View>
  );
}

export function CommentSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list} accessible={false}>
      {Array.from({ length: count }).map((_, index) => (
        <CommentSkeleton key={index} depth={index % 2} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  comment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Gap.sm,
  },
  reply: {
    marginLeft: Spacing["2xl"],
  },
  commentBody: {
    flex: 1,
    gap: Gap.xs,
  },
  commentText: {
    marginTop: Gap.xs,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    marginTop: Gap.xs,
  },
  likes: {
    alignItems: "center",
    gap: Gap.xs,
    paddingTop: Gap.xs,
  },
});
