// AuraLenz — Comment Skeleton
// Matches CommentSheet comment items

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";
import { Spacing, Radius, Gap } from "../../theme/spacing";

export function CommentSkeleton({ depth = 0 }: { depth?: number }) {
  return (
    <View style={[styles.comment, depth > 0 && { marginLeft: 36 }]}>
      <View style={styles.commentRow}>
        <SkeletonCircle size={30} style={styles.avatar} />
        <View style={styles.commentBody}>
          <SkeletonText lines={1} width="50%" lineHeight={20} style={styles.commentUser} />
          <SkeletonText lines={2} width={["80%", "50%"]} lineHeight={18} style={styles.commentText} />
          <View style={styles.commentActions}>
            <SkeletonText lines={1} width="40%" lineHeight={14} style={styles.commentTime} />
            <SkeletonText lines={1} width="30%" lineHeight={16} style={styles.replyBtn} />
          </View>
        </View>
        <SkeletonCircle size={28} style={styles.likeBtn} />
      </View>
    </View>
  );
}

export function CommentSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} depth={i % 2} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Spacing.lg,
    paddingBottom: 8,
  },
  comment: {
    marginBottom: 4,
  },
  commentRow: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentUser: {
    marginBottom: 2,
  },
  commentText: {
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
  },
  commentTime: {
    fontSize: 11,
  },
  replyBtn: {
    fontSize: 12,
  },
  likeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignSelf: "flex-start",
    marginTop: 10,
    marginLeft: 6,
  },
});