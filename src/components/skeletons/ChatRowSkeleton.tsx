import React from "react";
import { StyleSheet, View } from "react-native";
import { AvatarSize, Gap, IconSize, Radius, Spacing } from "../../theme/spacing";
import {
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useSkeletonColors,
} from "./Skeleton";

type ConversationRowVariant = "conversation" | "person";

export function ConversationRowSkeleton({
  variant = "conversation",
}: {
  variant?: ConversationRowVariant;
}) {
  const isConversation = variant === "conversation";

  return (
    <View style={styles.conversationRow} accessible={false}>
      <SkeletonCircle size={AvatarSize.lg} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Skeleton width={isConversation ? "44%" : "58%"} height={Spacing.md + Gap.xs} />
          {isConversation ? (
            <Skeleton width="20%" height={Spacing.sm + Gap.xs} />
          ) : null}
        </View>
        {isConversation ? (
          <SkeletonText width="72%" lineHeight={Spacing.lg} />
        ) : null}
      </View>
      {isConversation ? (
        <SkeletonCircle size={Spacing.xl} />
      ) : (
        <Skeleton width={IconSize.sm} height={IconSize.sm} borderRadius={Radius.xs} />
      )}
    </View>
  );
}

export function ConversationRowSkeletonList({
  count = 6,
  variant = "conversation",
}: {
  count?: number;
  variant?: ConversationRowVariant;
}) {
  const colors = useSkeletonColors();

  return (
    <View style={styles.conversationList} accessible={false}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dividedRow,
            { borderTopColor: colors.divider },
            ...(index === 0 ? [styles.firstRow] : []),
          ] as const}
        >
          <ConversationRowSkeleton variant={variant} />
        </View>
      ))}
    </View>
  );
}

export function MessageRowSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  const colors = useSkeletonColors();

  return (
    <View
      style={[
        styles.messageRow,
        isOwn ? styles.ownMessageRow : styles.otherMessageRow,
      ]}
      accessible={false}
    >
      {!isOwn ? <SkeletonCircle size={AvatarSize.xs + Gap.xs} /> : null}
      <View
        style={[
          styles.messageBubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          { backgroundColor: colors.surface },
        ]}
      >
        <SkeletonText lines={2} width={["78%", "54%"]} lineHeight={Spacing.lg} tone="overlay" />
      </View>
      {isOwn ? <SkeletonCircle size={AvatarSize.xs + Gap.xs} /> : null}
    </View>
  );
}

export function MessageRowSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.messageList} accessible={false}>
      {Array.from({ length: count }).map((_, index) => (
        <MessageRowSkeleton key={index} isOwn={index % 3 === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  conversationList: {
    paddingHorizontal: Spacing.lg,
  },
  dividedRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    paddingVertical: Spacing.md,
  },
  conversationContent: {
    flex: 1,
    gap: Gap.xs,
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Gap.sm,
  },
  messageList: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  messageRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Gap.sm,
  },
  otherMessageRow: {
    justifyContent: "flex-start",
  },
  ownMessageRow: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "76%",
    minWidth: "32%",
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  ownBubble: {
    borderBottomRightRadius: Radius.xs,
  },
  otherBubble: {
    borderBottomLeftRadius: Radius.xs,
  },
});
