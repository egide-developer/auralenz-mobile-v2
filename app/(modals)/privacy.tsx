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

export default function PrivacyScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  // null while the real value is still loading, so the switch never shows a
  // confidently-wrong state (this used to be a bare useState(false) that
  // never read from or wrote to the account at all - toggling it did
  // nothing server-side).
  const [isPrivate, setIsPrivate] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(API.users.settings)
      .then(({ data }) => {
        if (!active) return;
        setIsPrivate(data?.privacy?.profileVisibility === "private");
      })
      .catch(() => {
        if (active) showToast("Couldn't load privacy settings", "error");
      });
    return () => {
      active = false;
    };
  }, []);

  const toggle = async (value: boolean) => {
    const previous = isPrivate;
    setIsPrivate(value);
    setSaving(true);
    try {
      await api.put(API.users.settings, {
        privacy: { profileVisibility: value ? "private" : "public" },
      });
    } catch {
      setIsPrivate(previous);
      showToast("Couldn't update privacy settings", "error");
    } finally {
      setSaving(false);
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
        <Text style={{ fontFamily: FontFamily.semibold, fontSize: 20, color: colors.foreground }}>Privacy</Text>
      </GlassSurface>
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 0.5, borderColor: colors.border, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14 }}>
            <AppIcon icon={icons.lockClosed} size={20} color={colors.foreground} style={{ width: 26 }}  />
            <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>Private Account</Text>
            <Switch
              value={isPrivate ?? false}
              onValueChange={toggle}
              disabled={isPrivate === null || saving}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </View>
      </View>
      </ScrollView>
    </SafeAreaScreen>
  );
}
