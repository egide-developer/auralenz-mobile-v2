import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead} style={styles.markReadBtn}>
          <Text style={[styles.markReadText, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="notification" set="light" size={48} color={colors.mutedForeground + "60"} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No notifications</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.notifRow, { borderBottomColor: colors.border + "30", opacity: item.isRead ? 0.6 : 1 }]}>
            <View style={[styles.notifAvatar, { backgroundColor: colors.muted }]}>
              <Icon name="notification" set="light" size={16} color={colors.mutedForeground} />
            </View>
            <View style={styles.notifMeta}>
              <Text style={[styles.notifMessage, { color: colors.foreground }]}>{item.message}</Text>
              <Text style={[styles.notifDate, { color: colors.mutedForeground }]}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {!item.isRead && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
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
  headerTitle: { ...Typography.h4 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  markReadBtn: { paddingHorizontal: 8 },
  markReadText: { ...Typography.bodySmall, fontWeight: "600" },
  listContent: { paddingHorizontal: Spacing.lg },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { ...Typography.body },
  notifRow: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  notifAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notifMeta: { flex: 1 },
  notifMessage: { ...Typography.bodySmall, lineHeight: 20 },
  notifDate: { ...Typography.caption, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});
