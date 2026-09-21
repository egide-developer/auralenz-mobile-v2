import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const register = useAuthStore((s) => s.register);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const handleRegister = async () => {
    if (!displayName || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(email, password, displayName);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Create account
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Start sharing audio with the world
          </Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: Colors.light.destructive + "15", borderColor: Colors.light.destructive + "30" }]}>
              <Icon name="danger-circle" set="bold" size={18} color={Colors.light.destructive} />
              <Text style={[styles.errorText, { color: Colors.light.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Display Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card + "80", borderColor: colors.border + "4D" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
              <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.inputField, { color: colors.foreground }]}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground + "80"}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card + "80", borderColor: colors.border + "4D" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
              <Icon name="message" set="light" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.inputField, { color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground + "80"}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card + "80", borderColor: colors.border + "4D" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
              <Icon name="lock" set="light" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.inputField, styles.passwordField, { color: colors.foreground }]}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.mutedForeground + "80"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon
                  name={showPassword ? "hide" : "show"}
                  set="light"
                  size={18}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              Shadows[isDark ? "dark" : "light"]["soft-md"],
              loading && styles.buttonDisabled,
            ]}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
              {loading ? "Creating account..." : "Create Account"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Already have an account?{" "}
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    ...Typography.h1,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
  },
  form: {
    gap: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  errorText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    ...Typography.label,
    paddingHorizontal: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 10,
  },
  inputField: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 0,
  },
  passwordField: {
    paddingRight: 8,
  },
  button: {
    height: 48,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.button,
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    ...Typography.body,
  },
  footerLink: {
    ...Typography.body,
    fontFamily: FontFamily.semibold,
  },
});
