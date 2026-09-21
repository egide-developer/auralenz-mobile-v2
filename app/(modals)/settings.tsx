import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const colors = isDark ? Colors.dark : Colors.light;

  const sections = [
    {
      title: "Account",
      items: [
        { icon: "edit-square", label: "Edit Profile", route: "/(modals)/edit-profile" },
        { icon: "lock", label: "Change Password", route: "/(modals)/change-password" },
        { icon: "notification", label: "Email Settings", route: "" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: "show", label: "Dark Mode", toggle: true, value: isDark, onToggle: toggleTheme },
        { icon: "notification", label: "Notifications", route: "/(modals)/notification-settings" },
        { icon: "shield", label: "Privacy", route: "/(modals)/privacy" },
        { icon: "danger", label: "Blocked Users", route: "/(modals)/blocked-users" },
      ],
    },
    {
      title: "About",
      items: [
        { icon: "info-square", label: "About", route: "" },
        { icon: "document", label: "Terms of Service", route: "" },
        { icon: "show", label: "Privacy Policy", route: "" },
      ],
    },
  ];

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border + "30" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  if ("toggle" in item && item.onToggle) item.onToggle();
                  else if ("route" in item && item.route) router.push(item.route as any);
                }}
                style={[styles.menuRow, i < section.items.length - 1 && { borderBottomColor: colors.border + "30", borderBottomWidth: 0.5 }]}
              >
                <Icon name={item.icon} set="light" size={20} color={colors.foreground} />
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                {"toggle" in item ? (
                  <Switch value={item.value} onValueChange={item.onToggle} trackColor={{ true: colors.primary }} />
                ) : (
                  <Icon name="arrow-right" set="light" size={16} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.logoutContainer}>
        <TouchableOpacity
          onPress={logout}
          style={[styles.logoutBtn, { borderColor: Colors.light.destructive + "40" }]}
        >
          <Icon name="logout" set="light" size={18} color={Colors.light.destructive} />
          <Text style={[styles.logoutText, { color: Colors.light.destructive }]}>Log Out</Text>
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
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: { ...Typography.h4 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  section: { marginTop: 24, paddingHorizontal: Spacing.lg },
  sectionTitle: {
    ...Typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuLabel: { ...Typography.body, flex: 1 },
  logoutContainer: { paddingHorizontal: Spacing.lg, marginTop: 32 },
  logoutBtn: {
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { ...Typography.body, fontWeight: "600" },
});
