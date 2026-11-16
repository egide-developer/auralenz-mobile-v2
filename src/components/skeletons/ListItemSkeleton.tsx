import React from "react";
import { StyleSheet, View } from "react-native";
import { AvatarSize, Gap, IconSize, Spacing } from "../../theme/spacing";
import { Skeleton, SkeletonCircle, SkeletonText, useSkeletonColors } from "./Skeleton";

interface ListItemSkeletonProps {
  avatarSize?: number;
  showTime?: boolean;
  showAction?: boolean;
  lines?: number;
  showBadge?: boolean;
}

export function ListItemSkeleton({
  avatarSize = AvatarSize.lg,
  showTime = false,
  showAction = false,
  lines = 1,
  showBadge = false,
}: ListItemSkeletonProps) {
  return (
    <View style={styles.row} accessible={false}>
      <SkeletonCircle size={avatarSize} />
      <View style={styles.content}>
        <View style={styles.heading}>
          <Skeleton width="48%" height={Spacing.md + Gap.xs} />
          {showTime ? <Skeleton width="22%" height={Spacing.sm + Gap.xs} /> : null}
        </View>
        <SkeletonText
          lines={lines}
          width={["78%", "52%"]}
          lineHeight={Spacing.lg}
        />
      </View>
      {showAction || showBadge ? (
        <View style={styles.trailing}>
          {showBadge ? <SkeletonCircle size={IconSize.md} /> : null}
          {showAction ? <SkeletonCircle size={IconSize.md} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export function ListItemSkeletonList({
  count = 6,
  ...props
}: { count?: number } & ListItemSkeletonProps) {
  const colors = useSkeletonColors();

  return (
    <View style={styles.list} accessible={false}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.item,
            { borderTopColor: colors.divider },
            index > 0 && styles.dividedItem,
          ]}
        >
          <ListItemSkeleton {...props} />
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
    minHeight: AvatarSize.lg + Spacing.md * 2,
  },
  dividedItem: { borderTopWidth: StyleSheet.hairlineWidth },
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
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.sm,
  },
});
