import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>
            Profile
          </Text>
          <TouchableOpacity onPress={() => router.push("/(modals)/settings")}>
            <Ionicons name="settings-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.muted,
            marginBottom: 12,
          }}
        />
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
          {user?.username || "User"}
        </Text>
        {user?.bio && (
          <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 4, textAlign: "center", paddingHorizontal: 40 }}>
            {user.bio}
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 32, marginTop: 16 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              {user?.postsCount || 0}
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Posts</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              {user?.followersCount || 0}
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Followers</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              {user?.followingCount || 0}
            </Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Following</Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 2 }}>
        {[
          { icon: "person-outline" as const, label: "Edit Profile", route: "/(modals)/edit-profile" },
          { icon: "notifications-outline" as const, label: "Notifications", route: "/(modals)/notifications" },
          { icon: "folder-outline" as const, label: "Library", route: "/(modals)/library" },
          { icon: "shield-outline" as const, label: "Admin", route: "/(modals)/admin", adminOnly: true },
        ]
          .filter((item) => !item.adminOnly || user?.role === "admin")
          .map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as any)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 4,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons name={item.icon} size={22} color={colors.foreground} style={{ width: 28 }} />
              <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}

        <TouchableOpacity
          onPress={logout}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 4,
            marginTop: 12,
          }}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.destructive} style={{ width: 28 }} />
          <Text style={{ fontSize: 15, color: colors.destructive }}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
