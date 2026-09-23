import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { ChatGroup } from "../../src/types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(API.groups.list);
      const list = data.groups || data.data || [];
      setGroups(Array.isArray(list) ? list : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Groups</Text>
        <TouchableOpacity onPress={() => router.push("/(modals)/create-group")} style={styles.backBtn} hitSlop={8}>
          <Icon name="plus" set="bold" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Text style={{ color: colors.mutedForeground }}>No groups yet</Text>
              <PressableScale
                style={[styles.newGroupBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(modals)/create-group")}
              >
                <Text style={{ color: colors.primaryForeground, fontFamily: FontFamily.semibold }}>New group</Text>
              </PressableScale>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border + "20" }]}
              onPress={() => router.push({ pathname: "/messages/group/[groupId]", params: { groupId: item.id } })}
            >
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Icon name="user" set="light" size={22} color={colors.mutedForeground} />
                )}
              </View>
              <View style={styles.meta}>
                <View style={styles.metaHeader}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.lastMessage ? (
                    <Text style={[styles.time, { color: colors.mutedForeground }]}>
                      {timeAgo(item.lastMessage.timestamp)}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.preview, { color: item.unreadCount > 0 ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                  {item.lastMessage?.text || `${item.participants.length} members`}
                </Text>
              </View>
              {item.unreadCount > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100, gap: 14 },
  newGroupBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 50, height: 50 },
  meta: { flex: 1 },
  metaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontFamily: FontFamily.semibold, fontSize: 15 },
  time: { ...Typography.caption },
  preview: { ...Typography.bodySmall, marginTop: 2 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadText: { color: "#FFFFFF", fontSize: 11, fontFamily: FontFamily.bold },
});
