// AuraLenz — Profile Header Skeleton
// Matches ProfileScreen header: avatar, username, bio, stats row

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";
import { Spacing, Radius, Gap } from "../../theme/spacing";

export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.profileSection}>
      <SkeletonCircle size={88} style={styles.avatar} />
      <SkeletonText lines={1} width="50%" lineHeight={30} style={styles.username} />
      <SkeletonText lines={2} width={["80%", "50%"]} lineHeight={20} style={styles.bio} />
      <View style={styles.statsRow}>
        {["posts", "followers", "following"].map((_, i) => (
          <View key={i} style={styles.stat}>
            <SkeletonText lines={1} width="40%" lineHeight={24} style={styles.statValue} />
            <SkeletonText lines={1} width="50%" lineHeight={16} style={styles.statLabel} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    marginBottom: Spacing.md,
  },
  username: {
    marginBottom: Spacing.xs,
  },
  bio: {
    marginBottom: Spacing.base,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginTop: Spacing.base,
  },
  stat: { alignItems: "center" },
  statValue: { marginBottom: 2 },
  statLabel: {},
});