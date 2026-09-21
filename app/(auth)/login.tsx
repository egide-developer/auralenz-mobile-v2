import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

export default function LoginScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Text style={[styles.logoText, { color: colors.primaryForeground }]}>V</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>AuraLenz</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Share & Connect
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
            Log In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/register")}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  content: { alignItems: "center", marginBottom: 48 },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logoText: { fontSize: 32, fontWeight: "700" },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 15, marginTop: 4 },
  buttons: { width: "100%", gap: 12 },
  primaryBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 16, fontWeight: "600" },
  secondaryBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  secondaryBtnText: { fontSize: 16, fontWeight: "600" },
});
