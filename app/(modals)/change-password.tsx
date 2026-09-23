import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
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
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Change Password</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.form}>
        {[
          { label: "Current Password", value: current, set: setCurrent },
          { label: "New Password", value: newPass, set: setNewPass },
          { label: "Confirm Password", value: confirm, set: setConfirm },
        ].map((f) => (
          <View key={f.label} style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{f.label}</Text>
            <TextInput
              value={f.value}
              onChangeText={f.set}
              secureTextEntry
              style={[styles.input, {
                color: colors.foreground,
                backgroundColor: colors.card + "80",
              }, Shadows[isDark ? "dark" : "light"]["soft"]]}
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {loading ? "Saving..." : "Update Password"}
          </Text>
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
  headerTitle: { ...Typography.h4 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  form: { paddingHorizontal: Spacing.lg, gap: 14, marginTop: Spacing.md },
  inputGroup: { gap: 6 },
  label: { ...Typography.label, paddingHorizontal: 4 },
  input: {
    height: 48,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    ...Typography.body,
  },
  button: {
    height: 50,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: { ...Typography.button, fontSize: 16 },
});
