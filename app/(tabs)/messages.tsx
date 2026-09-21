import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Conversation } from "../../src/types";

export default function MessagesScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get(API.messages.conversations);
      setConversations(data.data || data.conversations || data);
    } catch {} finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="chat" set="light" size={48} color={colors.mutedForeground + "60"} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No conversations yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.conversationRow, { borderBottomColor: colors.border + "30" }]}
            onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id } })}
          >
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              <Icon name="user" set="light" size={20} color={colors.mutedForeground} />
            </View>
            <View style={styles.conversationMeta}>
              <View style={styles.conversationHeader}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name || item.participants?.[0]?.user?.username || "Chat"}
                </Text>
                {item.lastMessage && (
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>
                    {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                )}
              </View>
              {item.lastMessage && (
                <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.lastMessage.content}
                </Text>
              )}
            </View>
            {item.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                  {item.unreadCount > 9 ? "9+" : item.unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: { ...Typography.h3 },
  listContent: { paddingHorizontal: Spacing.lg },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { ...Typography.body },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  conversationMeta: { flex: 1 },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { ...Typography.body, fontWeight: "600", flex: 1, marginRight: 8 },
  time: { ...Typography.caption },
  preview: { ...Typography.bodySmall, marginTop: 2 },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
});
