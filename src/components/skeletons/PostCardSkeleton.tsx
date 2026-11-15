// AuraLenz — PostCard Skeleton
// Matches PostCard layout: avatar, username, time, media, caption, action row

import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonImage } from "./Skeleton";
import { Spacing, Radius, Gap } from "../../theme/spacing";

const SCREEN_WIDTH = Dimensions.get("window").width;

const MEDIA_WIDTH = SCREEN_WIDTH;
const MIN_MEDIA_HEIGHT = 240;
const MAX_MEDIA_HEIGHT = 400; // approximate

export function PostCardSkeleton({ style }: { style?: any }) {
  return (
    <View style={[styles.postCard, style]}>
      <View style={styles.card}>
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <SkeletonCircle size={36} />
            <View style={styles.postMeta}>
              <SkeletonText lines={1} width="60%" lineHeight={20} />
              <SkeletonText lines={1} width="40%" lineHeight={14} />
            </View>
          </View>
          <SkeletonCircle size={20} />
        </View>

        <SkeletonImage
          height={320}
          borderRadius={Radius.md}
          style={styles.mediaWrap}
        />

        <SkeletonText lines={2} width={["80%", "50%"]} lineHeight={20} style={styles.caption} />

        <View style={styles.postActions}>
          {["like", "comment", "share", "tip", "save"].map((_, i) => (
            <View key={i} style={styles.actionBtn}>
              <SkeletonCircle size={20} />
              <SkeletonText lines={1} width={30} lineHeight={16} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function PostCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} style={{ marginTop: i === 0 ? 0 : Spacing.sm }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  postCard: {
    marginBottom: 0,
    marginTop: 0,
  },
  card: {
    padding: Spacing.base,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  postHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  postMeta: {
    flex: 1,
    marginLeft: Gap.md,
  },
  mediaWrap: {
    marginHorizontal: -Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  caption: {
    marginBottom: Spacing.sm,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.lg,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.xs,
  },
  list: {
    paddingVertical: Spacing.sm,
  },
});