import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { onNewMessage } from "../../src/services/socket";
import type { Conversation } from "../../src/types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get(API.messages.conversations);
      setConversations(data.data || data.conversations || data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tabs stay mounted, so a plain mount-only effect never refires after you
  // read a thread and come back — the list would keep showing it as unread.
  // Refetch every time this screen regains focus instead.
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    const unsubscribe = onNewMessage(({ message, conversationId }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) return prev;
        const isMine = message.senderId === currentUser?.id;
        const updated: Conversation = {
          ...prev[idx],
          lastMessage: {
            text: message.isDeleted ? "Message deleted" : message.text,
            messageType: message.messageType,
            senderId: message.senderId,
            senderName: prev[idx].lastMessage?.senderName || "",
            messageId: message.id,
            isDeleted: message.isDeleted,
            timestamp: message.createdAt,
          },
          unreadCount: isMine ? prev[idx].unreadCount : prev[idx].unreadCount + 1,
        };
        const next = prev.filter((c) => c.id !== conversationId);
        return [updated, ...next];
      });
    });
    return unsubscribe;
  }, [currentUser?.id]);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => (c.user?.username || "").toLowerCase().includes(q));
  }, [conversations, query]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              {totalUnread} unread
            </Text>
          )}
        </View>
        <PressableScale
          style={[styles.composeBtn, { backgroundColor: colors.card + "90" }]}
          onPress={() => {}}
        >
          <Icon name="edit-square" set="light" size={19} color={colors.mutedForeground} />
        </PressableScale>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border + "30" }]}>
        <Icon name="search" set="light" size={17} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search messages"
          placeholderTextColor={colors.mutedForeground + "90"}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <Icon name="close-square" set="bold" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
              <Icon name="chat" set="light" size={48} color={colors.mutedForeground + "60"} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {query ? "No matches found" : "No conversations yet"}
              </Text>
            </Animated.View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const displayName = item.user?.username || "Chat";
          const avatarUrl = item.user?.avatarUrl;
          const unread = item.unreadCount > 0;
          const isMine = item.lastMessage?.senderId === currentUser?.id;

          return (
            <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
              <PressableScale
                scaleTo={0.97}
                style={[styles.conversationRow, unread && { backgroundColor: colors.primary + "08", borderRadius: 14, marginHorizontal: -6, paddingHorizontal: 6 }]}
                onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id } })}
              >
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Icon name="user" set="light" size={22} color={colors.mutedForeground} />
                  )}
                </View>
                <View style={styles.conversationMeta}>
                  <View style={styles.conversationHeader}>
                    <Text
                      style={[
                        styles.name,
                        { color: colors.foreground },
                        unread && styles.nameUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                    {item.lastMessage && (
                      <Text
                        style={[
                          styles.time,
                          { color: unread ? colors.primary : colors.mutedForeground },
                        ]}
                      >
                        {timeAgo(item.lastMessage.timestamp)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.previewRow}>
                    <Text
                      style={[
                        styles.preview,
                        { color: unread ? colors.foreground : colors.mutedForeground },
                        unread && styles.previewUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage
                        ? `${isMine ? "You: " : ""}${
                            item.lastMessage.isDeleted ? "Message deleted" : item.lastMessage.text
                          }`
                        : "Start a conversation"}
                    </Text>
                    {unread && (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.unreadText, { color: colors.primaryForeground }]}>
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { ...Typography.h3 },
  headerSubtitle: { ...Typography.caption, marginTop: 2 },
  composeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodySmall,
    paddingVertical: 0,
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { ...Typography.body },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: { width: 54, height: 54, borderRadius: 27 },
  conversationMeta: { flex: 1 },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { ...Typography.body, fontWeight: "600", flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: "700" },
  time: { ...Typography.caption },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  preview: { ...Typography.bodySmall, flex: 1, marginRight: 8 },
  previewUnread: { fontWeight: "600" },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  unreadText: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
});
