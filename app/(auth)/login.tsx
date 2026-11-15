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
import { CameraView, useCameraPermissions } from "expo-camera";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<{ challengeId: string; methods: Array<"email" | "totp">; email?: string } | null>(null);
  const [mfaMethod, setMfaMethod] = useState<"email" | "totp" | "recovery">("email");
  const [scanning, setScanning] = useState(false);
  const [deviceToken, setDeviceToken] = useState("");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((s) => s.login);
  const completeMfaLogin = useAuthStore((s) => s.completeMfaLogin);
  const claimLinkedDevice = useAuthStore((s) => s.claimLinkedDevice);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const handleLogin = async () => {
    if (deviceToken) {
      if (!securityCode) return setError("Enter the pairing code shown on the device that started this link");
    } else if (mfaChallenge) {
      if (!securityCode) return setError("Enter your security code");
    } else if (!email || !password) {
      setError("Enter your username, email, or phone number and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (deviceToken) {
        await claimLinkedDevice(deviceToken, securityCode);
      } else if (mfaChallenge) {
        await completeMfaLogin(mfaChallenge.challengeId, securityCode, mfaMethod);
      } else {
        const result = await login(email, password);
        if (result.requiresTwoFactor && result.challengeId && result.methods) {
          setMfaChallenge({
            challengeId: result.challengeId,
            methods: result.methods,
            email: result.email,
          });
          setMfaMethod(result.methods.includes("email") ? "email" : "totp");
          setSecurityCode("");
          return;
        }
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Login failed. Please try again.");
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
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to your account
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
            <Text style={[styles.label, { color: colors.foreground }]}>
              {deviceToken ? "Device pairing code" : mfaChallenge ? "Two-factor code" : "Username, email, or phone number"}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card + "80" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
              <Icon name={deviceToken || mfaChallenge ? "lock" : "message"} set="light" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.inputField, { color: colors.foreground }]}
                placeholder={deviceToken ? "6-digit pairing code" : mfaChallenge ? "6-digit code or recovery code" : "Username, email, or +14155552671"}
                placeholderTextColor={colors.mutedForeground + "80"}
                value={deviceToken || mfaChallenge ? securityCode : email}
                onChangeText={deviceToken || mfaChallenge ? setSecurityCode : setEmail}
                autoCapitalize="none"
                keyboardType={mfaChallenge && mfaMethod === "recovery" ? "default" : deviceToken || mfaChallenge ? "number-pad" : "default"}
                autoComplete={deviceToken || mfaChallenge ? "one-time-code" : "username"}
              />
            </View>
          </View>

          {mfaChallenge && !deviceToken && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([
                ...(mfaChallenge.methods.includes("email") ? ["email" as const] : []),
                ...(mfaChallenge.methods.includes("totp") ? ["totp" as const, "recovery" as const] : []),
              ]).map((method) => (
                <TouchableOpacity
                  key={method}
                  onPress={() => setMfaMethod(method)}
                  style={{ borderRadius: Radius.md, borderWidth: 1, borderColor: mfaMethod === method ? colors.primary : colors.border, paddingVertical: 8, paddingHorizontal: 10 }}
                >
                  <Text style={{ color: mfaMethod === method ? colors.primary : colors.foreground, fontSize: 12 }}>
                    {method === "totp" ? "Authenticator" : method === "recovery" ? "Recovery" : "Email"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!deviceToken && !mfaChallenge && <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card + "80" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
              <Icon name="lock" set="light" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.inputField, styles.passwordField, { color: colors.foreground }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground + "80"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
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
          </View>}

          {!deviceToken && !mfaChallenge && <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
            style={styles.forgotButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>}

          <TouchableOpacity
            onPress={handleLogin}
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
              {loading ? "Please wait..." : deviceToken ? "Link device" : mfaChallenge ? "Verify and sign in" : "Sign In"}
            </Text>
          </TouchableOpacity>

          {!mfaChallenge && !deviceToken && (
            <>
              {scanning ? (
                <View style={{ height: 240, overflow: "hidden", borderRadius: Radius.lg }}>
                  {cameraPermission?.granted ? (
                    <CameraView
                      style={{ flex: 1 }}
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      onBarcodeScanned={({ data }) => {
                        try {
                          const scanned = new URL(data);
                          const token = new URLSearchParams(scanned.hash.slice(1)).get("deviceLink")
                            || scanned.searchParams.get("deviceLink");
                          if (!token) throw new Error("Invalid device QR code");
                          setDeviceToken(token);
                          setScanning(false);
                          setError("");
                        } catch {
                          setError("This QR code is not a valid AuraLenz device link.");
                        }
                      }}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => void requestCameraPermission()}>
                      <Text style={{ color: colors.primary, padding: 18 }}>Allow camera access to scan a pairing QR.</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity onPress={() => setScanning(true)} style={{ alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ color: colors.primary, fontFamily: FontFamily.semibold }}>Link this device with a QR code</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {(mfaChallenge || deviceToken) && (
            <TouchableOpacity onPress={() => {
              setMfaChallenge(null);
              setDeviceToken("");
              setSecurityCode("");
              setError("");
            }} style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ color: colors.primary }}>Back to sign in</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Don't have an account?{" "}
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Sign Up
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
  forgotButton: {
    alignSelf: "flex-end",
  },
  forgotText: {
    ...Typography.bodySmall,
    fontFamily: FontFamily.semibold,
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
