import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

export default function BlockedUsersScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(API.users.blocked);
        setUsers(data.data || data.users || data);
      } catch {}
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="chevron-back" size={24} color={colors.foreground} /></TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>Blocked Users</Text>
      </View>
      <FlatList data={users} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={<View style={{ paddingVertical: 60, alignItems: "center" }}><Text style={{ color: colors.mutedForeground }}>No blocked users</Text></View>}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.muted, marginRight: 12 }} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>{item.username}</Text>
          </View>
        )} />
    </View>
  );
}
