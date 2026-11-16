import React from "react";
import { StyleSheet, View } from "react-native";
import { Gap, Radius, Spacing } from "../../theme/spacing";
import { Skeleton, SkeletonCircle, SkeletonText, useSkeletonColors } from "./Skeleton";

export function SearchUserSkeleton({
  showFollow = true,
  showVerified = false,
}: {
  showFollow?: boolean;
  showVerified?: boolean;
}) {
  return (
    <View style={styles.row} accessible={false}>
      <SkeletonCircle size={44} />
      <View style={styles.content}>
        <View style={styles.usernameRow}>
          <Skeleton width="58%" height={Spacing.md + Gap.xs} />
          {showVerified ? (
            <Skeleton width={Spacing.md} height={Spacing.md} borderRadius={Radius.xs} />
          ) : null}
        </View>
        <SkeletonText width="68%" lineHeight={Spacing.md + Gap.xs} />
      </View>
      {showFollow ? (
        <Skeleton width={80} height={Spacing["2xl"]} borderRadius={Radius.pill} />
      ) : null}
    </View>
  );
}

export function SearchUserSkeletonList({ count = 6 }: { count?: number }) {
  const colors = useSkeletonColors();

  return (
    <View style={styles.list} accessible={false}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.item,
            { borderBottomColor: colors.divider },
          ]}
        >
          <SearchUserSkeleton showVerified={index === 1} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.lg,
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Gap.md,
  },
  content: {
    flex: 1,
    gap: Gap.xs,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.sm,
  },
});
