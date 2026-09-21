import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [prefs, setPrefs] = useState({
    likes: true, comments: true, follows: true, messages: true, storyViews: false, groupInvites: true,
  });
  const toggle = (key: keyof typeof prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="chevron-back" size={24} color={colors.foreground} /></TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>Notification Settings</Text>
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 0.5, borderColor: colors.border, overflow: "hidden" }}>
          {(Object.keys(prefs) as (keyof typeof prefs)[]).map((key, i) => (
            <View key={key} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: i < Object.keys(prefs).length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 1, fontSize: 15, color: colors.foreground, textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, " $1")}</Text>
              <Switch value={prefs[key]} onValueChange={() => toggle(key)} trackColor={{ true: colors.primary }} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
