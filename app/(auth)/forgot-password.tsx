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
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { useThemeStore } from "../../src/stores/themeStore";
import { showToast } from "../../src/stores/toastStore";
import { Colors } from "../../src/theme/colors";
import { Radius } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";

/**
 * Two steps on one screen: request a reset code, then redeem it.
 *
 * Keeping the redeem step here rather than behind an emailed deep link means
 * recovery works today — the app has no deep-link handler wired up yet, so a
 * link-only flow would dead-end the moment the user left for their inbox.
 */
export default function ForgotPasswordScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [stage, setStage] = useState<"request" | "redeem">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestReset = async () => {
    if (!email.trim()) {
      setError("Enter the email address on your account");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post(API.auth.forgotPassword, { email: email.trim() });
      // Outside production the API hands back the reset link directly, which
      // saves needing a real inbox while developing.
      if (data?.devResetLink) {
        const match = String(data.devResetLink).match(/token=([^&]+)/);
        if (match) setToken(decodeURIComponent(match[1]));
      }
      setStage("redeem");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not send the reset email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const redeemReset = async () => {
    if (!token.trim() || !newPassword) {
      setError("Enter both the reset code and a new password");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post(API.auth.resetPassword, { token: token.trim(), newPassword });
      showToast("Password updated — sign in with your new password", "success");
      router.replace("/(auth)/login");
    } catch (e: any) {
      setError(e?.response?.data?.message || "That reset code is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const submit = stage === "request" ? requestReset : redeemReset;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {stage === "request" ? "Reset password" : "Enter your code"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {stage === "request"
              ? "We'll email you a code to reset your password."
              : `If an account exists for ${email.trim()}, a reset code is on its way. Enter it below with your new password.`}
          </Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={[styles.errorBox, { borderColor: "#FF4757", backgroundColor: "#FF475715" }]}>
              <Icon name="danger-circle" set="bold" size={18} color="#FF4757" />
              <Text style={[styles.errorText, { color: "#FF4757" }]}>{error}</Text>
            </View>
          ) : null}

          {stage === "request" ? (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                <Icon name="message" set="light" size={18} color={colors.mutedForeground} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground + "80"}
                  style={[styles.inputField, { color: colors.foreground }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Reset code</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                  <TextInput
                    value={token}
                    onChangeText={setToken}
                    placeholder="Paste the code from your email"
                    placeholderTextColor={colors.mutedForeground + "80"}
                    style={[styles.inputField, { color: colors.foreground }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>New password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card }]}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.mutedForeground + "80"}
                    style={[styles.inputField, { color: colors.foreground }]}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                    <Icon
                      name={showPassword ? "hide" : "show"}
                      set="light"
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            onPress={submit}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                {stage === "request" ? "Send reset code" : "Update password"}
              </Text>
            )}
          </TouchableOpacity>

          {stage === "redeem" ? (
            <TouchableOpacity onPress={() => { setStage("request"); setError(""); }} style={styles.footer}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Use a different email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  backButton: { position: "absolute", top: 8, left: 20, padding: 8 },
  header: { marginBottom: 32 },
  title: { ...Typography.h1, marginBottom: 8 },
  subtitle: { ...Typography.body },
  form: { gap: 16 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  errorText: { ...Typography.bodySmall, flex: 1 },
  inputGroup: { gap: 8 },
  label: { ...Typography.label, paddingHorizontal: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    gap: 10,
  },
  inputField: { flex: 1, ...Typography.body, paddingVertical: 0 },
  button: {
    height: 48,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.button, fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  footerLink: { ...Typography.body, fontFamily: FontFamily.semibold },
});
