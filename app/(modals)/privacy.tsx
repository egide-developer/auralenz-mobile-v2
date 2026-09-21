import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

export default function PrivacyScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [isPrivate, setIsPrivate] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="chevron-back" size={24} color={colors.foreground} /></TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>Privacy</Text>
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 0.5, borderColor: colors.border, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14 }}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.foreground} style={{ width: 26 }} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>Private Account</Text>
            <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: colors.primary }} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
