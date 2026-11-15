// AuraLenz — Chat/Message Row Skeletons
// Matches conversation list and message list

import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";
import { Spacing, Radius, Gap } from "../../theme/spacing";

export function ConversationRowSkeleton() {
  return (
    <View style={styles.row}>
      <SkeletonCircle size={48} style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.header}>
          <SkeletonText lines={1} width="60%" lineHeight={21} />
          <SkeletonText lines={1} width="30%" lineHeight={14} style={styles.time} />
        </View>
        <View style={styles.previewRow}>
          <SkeletonText lines={1} width="80%" lineHeight={18} />
          <Skeleton
            width={22}
            height={22}
            borderRadius={11}
            style={styles.unreadBadge}
          />
        </View>
      </View>
    </View>
  );
}

export function ConversationRowSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.item, i > 0 && { borderTopWidth: 0.5 }]}>
          <ConversationRowSkeleton />
        </View>
      ))}
    </View>
  );
}

export function MessageRowSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <View style={[styles.messageRow, isOwn && { flexDirection: "row-reverse" }]}>
      {!isOwn && <SkeletonCircle size={28} style={styles.messageAvatar} />}
      <View style={styles.messageBubble}>
        <SkeletonText lines={1} width="70%" lineHeight={20} />
        <SkeletonText lines={1} width="40%" lineHeight={18} />
      </View>
      {isOwn && <SkeletonCircle size={28} style={styles.messageAvatar} />}
    </View>
  );
}

export function MessageRowSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.messageList}>
      {Array.from({ length: count }).map((_, i) => (
        <MessageRowSkeleton key={i} isOwn={i % 3 === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    marginLeft: 8,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#99CC33",
  },
  list: {
    paddingHorizontal: Spacing.lg,
  },
  item: {
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  messageList: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageAvatar: {
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
});