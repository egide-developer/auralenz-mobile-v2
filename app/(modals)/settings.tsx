import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

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
        { icon: "person-outline" as const, label: "Edit Profile", route: "/(modals)/edit-profile" },
        { icon: "lock-closed-outline" as const, label: "Change Password", route: "/(modals)/change-password" },
        { icon: "mail-outline" as const, label: "Email Settings", route: "" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: "moon-outline" as const, label: "Dark Mode", toggle: true, value: isDark, onToggle: toggleTheme },
        { icon: "notifications-outline" as const, label: "Notifications", route: "/(modals)/notification-settings" },
        { icon: "shield-outline" as const, label: "Privacy", route: "/(modals)/privacy" },
        { icon: "ban-outline" as const, label: "Blocked Users", route: "/(modals)/blocked-users" },
      ],
    },
    {
      title: "About",
      items: [
        { icon: "information-circle-outline" as const, label: "About", route: "" },
        { icon: "document-text-outline" as const, label: "Terms of Service", route: "" },
        { icon: "eye-outline" as const, label: "Privacy Policy", route: "" },
      ],
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>Settings</Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {section.title}
          </Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 0.5, borderColor: colors.border, overflow: "hidden" }}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => {
                  if ("toggle" in item && item.onToggle) item.onToggle();
                  else if ("route" in item && item.route) router.push(item.route as any);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderBottomWidth: i < section.items.length - 1 ? 0.5 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Ionicons name={item.icon} size={20} color={colors.foreground} style={{ width: 26 }} />
                <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>{item.label}</Text>
                {"toggle" in item ? (
                  <Switch value={item.value} onValueChange={item.onToggle} trackColor={{ true: colors.primary }} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={{ paddingHorizontal: 16, marginTop: 32 }}>
        <TouchableOpacity
          onPress={logout}
          style={{ height: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.destructive, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.destructive }}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
