import { View, Text, FlatList, RefreshControl } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>
          Messages
        </Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <Text style={{ color: colors.mutedForeground }}>No conversations yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.muted,
                marginRight: 12,
              }}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 15 }} numberOfLines={1}>
                  {item.name || item.participants?.[0]?.user?.username || "Chat"}
                </Text>
                {item.lastMessage && (
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                )}
              </View>
              {item.lastMessage && (
                <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                  {item.lastMessage.content}
                </Text>
              )}
            </View>
            {item.unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: "#000", fontSize: 11, fontWeight: "700" }}>
                  {item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}
