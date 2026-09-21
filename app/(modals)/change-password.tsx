import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import api from "../../src/api/client";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!current || !newPass || !confirm) { Alert.alert("Error", "Fill all fields"); return; }
    if (newPass !== confirm) { Alert.alert("Error", "Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword: current, newPassword: newPass });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}><Ionicons name="chevron-back" size={24} color={colors.foreground} /></TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>Change Password</Text>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 8 }}>
        {[
          { label: "Current Password", value: current, set: setCurrent, secure: true },
          { label: "New Password", value: newPass, set: setNewPass, secure: true },
          { label: "Confirm Password", value: confirm, set: setConfirm, secure: true },
        ].map((f) => (
          <View key={f.label}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 6 }}>{f.label}</Text>
            <TextInput value={f.value} onChangeText={f.set} secureTextEntry={f.secure}
              style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: 14, color: colors.foreground, fontSize: 15 }} />
          </View>
        ))}
        <TouchableOpacity onPress={handleSubmit} disabled={loading}
          style={{ height: 50, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 8, opacity: loading ? 0.6 : 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.primaryForeground }}>{loading ? "Saving..." : "Update Password"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
