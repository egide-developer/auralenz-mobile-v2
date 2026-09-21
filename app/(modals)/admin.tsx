import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
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
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>Access Denied</Text>
      </View>
    );
  }

  const stats = [
    { label: "Users", value: dashboard.totalUsers || 0, icon: "people-outline" as const },
    { label: "Posts", value: dashboard.totalPosts || 0, icon: "document-text-outline" as const },
    { label: "Messages", value: dashboard.totalMessages || 0, icon: "chatbubble-outline" as const },
    { label: "Stories", value: dashboard.totalStories || 0, icon: "film-outline" as const },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboard(); }} tintColor={colors.primary} />}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>Admin Dashboard</Text>
      </View>

      {/* Stats grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 10 }}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={{
              width: "47%",
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <Ionicons name={stat.icon} size={22} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>
              {stat.value.toLocaleString()}
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          Quick Actions
        </Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 0.5, borderColor: colors.border, overflow: "hidden" }}>
          {[
            { icon: "people-outline" as const, label: "Manage Users" },
            { icon: "document-text-outline" as const, label: "Manage Posts" },
            { icon: "receipt-outline" as const, label: "System Logs" },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 14,
                borderBottomWidth: i < 2 ? 0.5 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons name={item.icon} size={20} color={colors.foreground} style={{ width: 26 }} />
              <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
