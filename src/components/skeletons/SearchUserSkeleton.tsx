// AuraLenz — Search User Row Skeleton
// Matches SearchScreen user rows

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";
import { Spacing, Radius, Gap } from "../../theme/spacing";

export function SearchUserSkeleton({ showFollow = true }: { showFollow?: boolean }) {
  return (
    <View style={styles.row}>
      <SkeletonCircle size={44} style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.usernameRow}>
          <SkeletonText lines={1} width="60%" lineHeight={21} />
          <SkeletonCircle size={14} />
        </View>
        <SkeletonText lines={1} width="70%" lineHeight={16} />
      </View>
      {showFollow && (
        <Skeleton
          width={80}
          height={32}
          borderRadius={9999}
          style={styles.followBtn}
        />
      )}
    </View>
  );
}

export function SearchUserSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.item, i > 0 && { borderTopWidth: 0.5 }]}>
          <SearchUserSkeleton />
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
  row: {
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
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  followBtn: {
    marginLeft: Gap.sm,
  },
});