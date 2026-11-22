import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { AppIcon } from "../../src/components/ui/AppIcon";
import { GlassSurface } from "../../src/components/ui/GlassSurface";
import { icons } from "../../src/constants/icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { FontFamily } from "../../src/theme/typography";
import { SafeAreaScreen } from "../../src/components/layout";
import { showToast } from "../../src/stores/toastStore";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

// Must match the backend's allow-list exactly (routes/users.js PUT /settings)
// - anything else is silently dropped server-side.
const NOTIFICATION_KEYS = ["likes", "comments", "mentions", "follows", "messages"] as const;
type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

const LABELS: Record<NotificationKey, string> = {
  likes: "Likes",
  comments: "Comments",
  mentions: "Mentions",
  follows: "New followers",
  messages: "Direct messages",
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [prefs, setPrefs] = useState<Record<NotificationKey, boolean> | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get(API.users.settings)
      .then(({ data }) => {
        if (!active) return;
        const loaded = data?.notificationSettings || {};
        const next = {} as Record<NotificationKey, boolean>;
        for (const key of NOTIFICATION_KEYS) {
          next[key] = loaded[key] !== false;
        }
        setPrefs(next);
      })
      .catch(() => {
        if (active) showToast("Couldn't load notification settings", "error");
      });
    return () => {
      active = false;
    };
  }, []);

  const toggle = async (key: NotificationKey) => {
    if (!prefs) return;
    const value = !prefs[key];
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    try {
      await api.put(API.users.settings, { notificationSettings: { [key]: value } });
    } catch {
      setPrefs(previous);
      showToast("Couldn't update notification settings", "error");
    }
  };

  return (
    <SafeAreaScreen style={{ backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <GlassSurface
        intensity="regular"
        bordered
        borderEdge="bottom"
        radius={0}
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><AppIcon icon={icons.chevronBack} size={24} color={colors.foreground}  /></TouchableOpacity>
        <Text style={{ fontFamily: FontFamily.semibold, fontSize: 20, color: colors.foreground }}>Notification Settings</Text>
      </GlassSurface>
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 0.5, borderColor: colors.border, overflow: "hidden" }}>
          {NOTIFICATION_KEYS.map((key, i) => (
            <View key={key} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: i < NOTIFICATION_KEYS.length - 1 ? 0.5 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>{LABELS[key]}</Text>
              <Switch
                value={prefs?.[key] ?? true}
                onValueChange={() => toggle(key)}
                disabled={!prefs}
                trackColor={{ true: colors.primary }}
              />
            </View>
          ))}
        </View>
      </View>
      </ScrollView>
    </SafeAreaScreen>
  );
}
