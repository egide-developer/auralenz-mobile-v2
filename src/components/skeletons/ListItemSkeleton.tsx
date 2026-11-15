// AuraLenz — List Item Skeleton
// Matches menu rows, chat rows, notification rows, user rows

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";
import { Spacing, Radius, Gap } from "../../theme/spacing";

interface ListItemSkeletonProps {
  avatarSize?: number;
  showTime?: boolean;
  showAction?: boolean;
  lines?: number;
  showBadge?: boolean;
}

export function ListItemSkeleton({
  avatarSize = 48,
  showTime = false,
  showAction = false,
  lines = 1,
  showBadge = false,
}: ListItemSkeletonProps) {
  return (
    <View style={styles.container}>
      <SkeletonCircle size={avatarSize} style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.header}>
          <SkeletonText lines={1} width="60%" lineHeight={21} />
          {showTime && <SkeletonText lines={1} width="30%" lineHeight={14} style={styles.time} />}
        </View>
        <SkeletonText lines={lines} width={["80%", "50%"]} lineHeight={18} />
      </View>
      {(showAction || showBadge) && (
        <View style={styles.trailing}>
          {showBadge && <SkeletonCircle size={20} />}
          {showAction && <SkeletonCircle size={20} />}
        </View>
      )}
    </View>
  );
}

export function ListItemSkeletonList({ count = 6, ...props }: { count?: number } & ListItemSkeletonProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.item, i === 0 ? {} : { borderTopWidth: 0.5 }]}>
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
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Gap.md,
  },
  avatar: {},
  content: {
    flex: 1,
    gap: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    textAlign: "right",
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.sm,
  },
});