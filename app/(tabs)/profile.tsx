import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing, Gap } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { HighlightsRow } from "../../src/components/profile/HighlightsRow";
import { Screen } from "../../src/components/layout";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const menuItems = [
    { icon: "edit-square", label: "Edit profile", route: "/(modals)/edit-profile" },
    { icon: "notification", label: "Notifications", route: "/(modals)/notifications" },
    { icon: "bookmark", label: "Saved", route: "/(modals)/saved-posts" },
    { icon: "folder", label: "Library", route: "/(modals)/library" },
    { icon: "bookmark", label: "Archived posts", route: "/(modals)/archived-posts" },
    { icon: "star", label: "Close friends", route: "/(modals)/close-friends" },
    { icon: "wallet", label: "Wallet & stars", route: "/(modals)/wallet" },
    { icon: "ticket", label: "Subscriptions", route: "/(modals)/subscriptions" },
    { icon: "shield", label: "Admin", route: "/(modals)/admin", adminOnly: true as const },
  ];

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
          <TouchableOpacity
            onPress={() => router.push("/(modals)/settings")}
            style={[styles.settingsBtn, { backgroundColor: colors.card + "80" }]}
          >
            <Icon name="setting" set="light" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      }
      scroll
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          {user?.avatarUrl ? (
            <CachedImage source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Icon name="user" set="light" size={36} color={colors.mutedForeground} />
          )}
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
            { label: "Followers", value: user?.followersCount || 0, mode: "followers" as const },
            { label: "Following", value: user?.followingCount || 0, mode: "following" as const },
          ].map((stat) =>
            stat.mode && user?.id ? (
              <TouchableOpacity
                key={stat.label}
                style={styles.stat}
                onPress={() =>
                  router.push({
                    pathname: "/profile/follow-list",
                    params: { userId: user.id, mode: stat.mode, title: stat.label },
                  })
                }
              >
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </TouchableOpacity>
            ) : (
              <View key={stat.label} style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            )
          )}
        </View>
      </View>

      {user?.id ? <HighlightsRow userId={user.id} colors={colors} /> : null}

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.h3 },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingBottom: Spacing.xl },
  profileSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  avatarImg: { width: 88, height: 88 },
  username: { ...Typography.h2 },
  bio: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginTop: Spacing.base,
  },
  stat: { alignItems: "center" },
  statValue: { ...Typography.h4 },
  statLabel: { ...Typography.caption, marginTop: 2 },
  menuSection: {
    paddingHorizontal: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Gap.md,
  },
  menuLabel: {
    ...Typography.body,
    flex: 1,
  },
  logoutRow: {
    marginTop: Spacing.sm,
    borderBottomWidth: 0,
  },
});