import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

interface DashboardData {
  totalUsers?: number;
  totalPosts?: number;
  totalMessages?: number;
  totalStories?: number;
}

export default function AdminScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await api.get(API.admin.dashboard);
      setDashboard(data.data || data);
    } catch {} finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    fetchDashboard();
  }, []);

  if (user?.role !== "admin") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon name="shield-fail" set="bold" size={48} color={colors.mutedForeground + "60"} />
        <Text style={[styles.deniedText, { color: colors.mutedForeground }]}>Access Denied</Text>
      </View>
    );
  }

  const stats = [
    { label: "Users", value: dashboard.totalUsers || 0, icon: "user" },
    { label: "Posts", value: dashboard.totalPosts || 0, icon: "document" },
    { label: "Messages", value: dashboard.totalMessages || 0, icon: "chat" },
    { label: "Stories", value: dashboard.totalStories || 0, icon: "image" },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} tintColor={colors.primary} />}
    >
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Admin Dashboard</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border + "30" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
            <Icon name={stat.icon} set="light" size={22} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsSection}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Quick Actions</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card, borderColor: colors.border + "30" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
          {[
            { icon: "user", label: "Manage Users" },
            { icon: "document", label: "Manage Posts" },
            { icon: "paper", label: "System Logs" },
          ].map((item, i) => (
            <TouchableOpacity key={item.label} style={[styles.actionRow, i < 2 && { borderBottomColor: colors.border + "30", borderBottomWidth: 0.5 }]}>
              <Icon name={item.icon} set="light" size={20} color={colors.foreground} />
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Icon name="arrow-right" set="light" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  deniedText: { ...Typography.body },
  scrollContent: { paddingBottom: 40 },
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.lg,
    gap: 10,
  },
  statCard: {
    width: "47%",
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.base,
    gap: 4,
  },
  statValue: { ...Typography.h2, marginTop: 4 },
  statLabel: { ...Typography.caption, marginTop: 2 },
  actionsSection: { paddingHorizontal: Spacing.lg },
  sectionTitle: { ...Typography.label, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  actionsCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: "hidden" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  actionLabel: { ...Typography.body, flex: 1 },
});
