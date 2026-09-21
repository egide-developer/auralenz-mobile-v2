import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const menuItems = [
    { icon: "edit-square", label: "Edit Profile", route: "/(modals)/edit-profile" },
    { icon: "notification", label: "Notifications", route: "/(modals)/notifications" },
    { icon: "folder", label: "Library", route: "/(modals)/library" },
    { icon: "shield", label: "Admin", route: "/(modals)/admin", adminOnly: true as const },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity
          onPress={() => router.push("/(modals)/settings")}
          style={[styles.settingsBtn, { backgroundColor: colors.card + "80" }]}
        >
          <Icon name="setting" set="light" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          <Icon name="user" set="light" size={36} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.username, { color: colors.foreground }]}>
          {user?.username || "User"}
        </Text>
        {user?.bio && (
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{user.bio}</Text>
        )}

        <View style={styles.statsRow}>
          {[
            { label: "Posts", value: user?.postsCount || 0 },
            { label: "Followers", value: user?.followersCount || 0 },
            { label: "Following", value: user?.followingCount || 0 },
          ].map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.menuSection}>
        {menuItems
          .filter((item) => !item.adminOnly || user?.role === "admin")
          .map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as any)}
              style={[styles.menuRow, { borderBottomColor: colors.border + "30" }]}
            >
              <Icon name={item.icon} set="light" size={22} color={colors.foreground} />
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Icon name="arrow-right" set="light" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}

        <TouchableOpacity
          onPress={logout}
          style={[styles.menuRow, styles.logoutRow]}
        >
          <Icon name="logout" set="light" size={22} color={Colors.light.destructive} />
          <Text style={[styles.menuLabel, { color: Colors.light.destructive }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  headerTitle: { ...Typography.h3 },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  username: { ...Typography.h2 },
  bio: {
    ...Typography.bodySmall,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginTop: Spacing.base,
  },
  stat: { alignItems: "center" },
  statValue: { ...Typography.h4 },
  statLabel: { ...Typography.caption, marginTop: 2 },
  menuSection: {
    paddingHorizontal: Spacing.lg,
    gap: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  menuLabel: {
    ...Typography.body,
    flex: 1,
  },
  logoutRow: {
    marginTop: Spacing.md,
    borderBottomWidth: 0,
  },
});
