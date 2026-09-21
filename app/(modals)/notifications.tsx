import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { AppNotification } from "../../src/types";

export default function NotificationsScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(API.notifications.list);
        setNotifications(data.data || data.notifications || data);
      } catch {}
    })();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put(API.notifications.readAll);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, flex: 1 }}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "600" }}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <Text style={{ color: colors.mutedForeground }}>No notifications</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
              opacity: item.isRead ? 0.6 : 1,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.muted, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
                {item.message}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {!item.isRead && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 }} />
            )}
          </View>
        )}
      />
    </View>
  );
}
