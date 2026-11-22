import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { AppIcon } from "../../src/components/ui/AppIcon";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { GlassSurface } from "../../src/components/ui/GlassSurface";
import { icons } from "../../src/constants/icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { FontFamily } from "../../src/theme/typography";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { SafeAreaScreen } from "../../src/components/layout";
import { showToast } from "../../src/stores/toastStore";

interface BlockedUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(API.users.blocked);
        setUsers(data.data || data.users || data);
      } catch {
        showToast("Couldn't load blocked users", "error");
      }
    })();
  }, []);

  const unblock = async (user: BlockedUser) => {
    setUnblockingId(user.id);
    try {
      await api.delete(API.users.unblock(user.id));
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast(`Unblocked @${user.username}`, "success");
    } catch {
      showToast("Couldn't unblock this user", "error");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <SafeAreaScreen style={{ flex: 1, backgroundColor: colors.background }}>
      <GlassSurface
        intensity="regular"
        bordered
        borderEdge="bottom"
        radius={0}
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><AppIcon icon={icons.chevronBack} size={24} color={colors.foreground}  /></TouchableOpacity>
        <Text style={{ fontFamily: FontFamily.semibold, fontSize: 20, color: colors.foreground }}>Blocked Users</Text>
      </GlassSurface>
      <FlatList data={users} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={<View style={{ paddingVertical: 60, alignItems: "center" }}><Text style={{ color: colors.mutedForeground }}>No blocked users</Text></View>}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            {item.avatarUrl ? (
              <CachedImage source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.muted, marginRight: 12 }} />
            )}
            <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>{item.username}</Text>
            <TouchableOpacity
              onPress={() => unblock(item)}
              disabled={unblockingId === item.id}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: unblockingId === item.id ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.foreground, fontFamily: FontFamily.medium, fontSize: 13 }}>
                {unblockingId === item.id ? "Unblocking…" : "Unblock"}
              </Text>
            </TouchableOpacity>
          </View>
        )} />
    </SafeAreaScreen>
  );
}
