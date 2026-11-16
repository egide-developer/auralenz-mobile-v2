import { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { SafeAreaScreen } from "../../src/components/layout";

type SecurityStatus = {
  mfaEnabled: boolean;
  methods: Array<"email" | "totp">;
  phoneNumber: string | null;
  phoneVerified: boolean;
  sessions: number;
  email: string;
};

type Device = { id: string; name: string; createdAt: string; ip: string | null };

export default function SecurityScreen() {
  const isDark = useThemeStore((state) => state.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [emailChallenge, setEmailChallenge] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [totp, setTotp] = useState<{ qrCode: string; secret: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [phoneChallenge, setPhoneChallenge] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [pairing, setPairing] = useState<{ qrCode: string; confirmationCode: string } | null>(null);

  const refresh = useCallback(async () => {
    const [statusResponse, devicesResponse] = await Promise.all([
      api.get(API.auth.securityStatus),
      api.get(API.auth.devices),
    ]);
    setStatus(statusResponse.data);
    setDevices(devicesResponse.data.devices || []);
  }, []);

  useEffect(() => {
    refresh()
      .catch((cause: any) => setError(cause?.response?.data?.message || "Unable to load account security."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const perform = async (action: () => Promise<void>) => {
    setError("");
    setMessage("");
    try {
      await action();
    } catch (cause: any) {
      setError(cause?.response?.data?.message || cause?.message || "The security request failed.");
    }
  };

  const startEmailMfa = () => perform(async () => {
    const { data } = await api.post(API.auth.emailMfaStart);
    setEmailChallenge(data.challengeId);
    setMessage(`A code was sent to ${data.email}.`);
  });

  const verifyEmailMfa = () => perform(async () => {
    await api.post(API.auth.emailMfaVerify, { challengeId: emailChallenge, code: emailCode });
    setEmailChallenge("");
    setEmailCode("");
    await refresh();
    setMessage("Email two-factor authentication is enabled.");
  });

  const removeEmailMfa = () => perform(async () => {
    await api.delete(API.auth.emailMfa, { data: { password } });
    setPassword("");
    await refresh();
  });

  const startTotp = () => perform(async () => {
    const { data } = await api.post(API.auth.totpSetup);
    setTotp(data);
  });

  const verifyTotp = () => perform(async () => {
    const { data } = await api.post(API.auth.totpVerify, { code: totpCode });
    setTotp(null);
    setTotpCode("");
    setRecoveryCodes(data.recoveryCodes);
    await refresh();
    setMessage("Authenticator enabled. Save your recovery codes now.");
  });

  const removeTotp = () => perform(async () => {
    await api.delete(API.auth.totp, { data: { code: totpCode, method: "totp" } });
    setTotpCode("");
    await refresh();
  });

  const startPhone = () => perform(async () => {
    const { data } = await api.post(API.auth.phoneStart, { phoneNumber: phone, password });
    setPhoneChallenge(data.challengeId);
    setMessage(`A verification SMS was sent to ${data.phoneNumber}.`);
  });

  const verifyPhone = () => perform(async () => {
    await api.post(API.auth.phoneVerify, { challengeId: phoneChallenge, code: phoneCode });
    setPhoneChallenge("");
    setPhoneCode("");
    setPhone("");
    setPassword("");
    await refresh();
    setMessage("Phone number verified. You can now sign in with it and your password.");
  });

  const removePhone = () => perform(async () => {
    await api.delete(API.auth.phone, { data: { password } });
    setPassword("");
    await refresh();
  });

  const startDeviceLink = () => perform(async () => {
    const { data } = await api.post(API.auth.deviceLink);
    setPairing({ qrCode: data.qrCode, confirmationCode: data.confirmationCode });
  });

  const revokeDevice = (id: string) => perform(async () => {
    await api.delete(API.auth.revokeDevice(id));
    setDevices((current) => current.filter((device) => device.id !== id));
  });

  const inputStyle = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }];
  const cardStyle = [styles.card, { backgroundColor: colors.card, borderColor: colors.border + "55" }];

  return (
    <SafeAreaScreen style={{ backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Security & devices</Text>
      </View>
      {error ? <Text style={[styles.notice, { color: Colors.light.destructive }]}>{error}</Text> : null}
      {message ? <Text style={[styles.notice, { color: colors.primary }]}>{message}</Text> : null}
      {loading ? <Text style={{ color: colors.mutedForeground }}>Loading security settings…</Text> : null}

      <View style={cardStyle}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Two-factor authentication</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {status?.mfaEnabled ? "Enabled for password sign-ins." : "Choose email codes, an authenticator app, or both."}
        </Text>

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={[styles.label, { color: colors.foreground }]}>Email one-time codes</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{status?.email}</Text>
          </View>
          {status?.methods.includes("email") ? <Text style={{ color: colors.primary }}>On</Text> : <ActionButton label="Enable" onPress={startEmailMfa} color={colors.primary} />}
        </View>
        {emailChallenge ? (
          <View style={styles.row}>
            <TextInput value={emailCode} onChangeText={setEmailCode} placeholder="Email code" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={[inputStyle, styles.flex]} />
            <ActionButton label="Verify" onPress={verifyEmailMfa} color={colors.primary} />
          </View>
        ) : null}
        {status?.methods.includes("email") ? (
          <View style={styles.row}>
            <TextInput value={password} onChangeText={setPassword} placeholder="Password to disable" placeholderTextColor={colors.mutedForeground} secureTextEntry style={[inputStyle, styles.flex]} />
            <ActionButton label="Disable" onPress={removeEmailMfa} color={colors.destructive} />
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={[styles.label, { color: colors.foreground }]}>Authenticator app</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>TOTP-compatible apps like Google Authenticator.</Text>
          </View>
          {status?.methods.includes("totp") ? <Text style={{ color: colors.primary }}>On</Text> : <ActionButton label="Set up" onPress={startTotp} color={colors.primary} />}
        </View>
        {totp ? (
          <View style={styles.stack}>
            <Image source={{ uri: totp.qrCode }} style={styles.qr} />
            <Text selectable style={[styles.secret, { color: colors.mutedForeground }]}>Manual key: {totp.secret}</Text>
            <TextInput value={totpCode} onChangeText={setTotpCode} placeholder="6-digit authenticator code" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={inputStyle} />
            <ActionButton label="Verify and enable" onPress={verifyTotp} color={colors.primary} />
          </View>
        ) : null}
        {status?.methods.includes("totp") ? (
          <View style={styles.row}>
            <TextInput value={totpCode} onChangeText={setTotpCode} placeholder="Authenticator code to disable" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={[inputStyle, styles.flex]} />
            <ActionButton label="Disable" onPress={removeTotp} color={colors.destructive} />
          </View>
        ) : null}
        {recoveryCodes.length > 0 ? (
          <View style={styles.recovery}>
            <Text style={[styles.label, { color: colors.foreground }]}>Save these one-time recovery codes</Text>
            <Text selectable style={[styles.secret, { color: colors.foreground }]}>{recoveryCodes.join("\n")}</Text>
            <ActionButton label="I saved them" onPress={() => setRecoveryCodes([])} color={colors.primary} />
          </View>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Phone sign-in</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>Verify a phone number to use it with your existing password.</Text>
        {status?.phoneVerified ? (
          <>
            <Text style={[styles.label, { color: colors.primary }]}>{status.phoneNumber}</Text>
            <TextInput value={password} onChangeText={setPassword} placeholder="Password to remove phone" placeholderTextColor={colors.mutedForeground} secureTextEntry style={inputStyle} />
            <ActionButton label="Remove phone number" onPress={removePhone} color={colors.destructive} />
          </>
        ) : phoneChallenge ? (
          <>
            <TextInput value={phoneCode} onChangeText={setPhoneCode} placeholder="SMS verification code" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" style={inputStyle} />
            <ActionButton label="Verify phone" onPress={verifyPhone} color={colors.primary} />
          </>
        ) : (
          <>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+14155552671" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" autoComplete="tel" style={inputStyle} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Confirm your password" placeholderTextColor={colors.mutedForeground} secureTextEntry style={inputStyle} />
            <ActionButton label="Send SMS code" onPress={startPhone} color={colors.primary} />
          </>
        )}
      </View>

      <View style={cardStyle}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Linked devices</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>Scan this QR code on the new device, then enter the pairing code shown here.</Text>
        <ActionButton label="Create device pairing QR" onPress={startDeviceLink} color={colors.primary} />
        {pairing ? (
          <View style={styles.pairing}>
            <Image source={{ uri: pairing.qrCode }} style={styles.qr} />
            <Text style={[styles.description, { color: colors.mutedForeground }]}>Enter this code on the device you’re linking. It expires in 10 minutes.</Text>
            <Text selectable style={[styles.pairingCode, { color: colors.foreground }]}>{pairing.confirmationCode}</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>Only enter this code on a device you’re linking to your account.</Text>
          </View>
        ) : null}
        <Text style={[styles.label, { color: colors.foreground }]}>{devices.length} active session{devices.length === 1 ? "" : "s"}</Text>
        {devices.map((device) => (
          <View key={device.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: colors.foreground }]}>{device.name}</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{new Date(device.createdAt).toLocaleString()}{device.ip ? ` · ${device.ip}` : ""}</Text>
            </View>
            <ActionButton label="Sign out" onPress={() => revokeDevice(device.id)} color={colors.destructive} />
          </View>
        ))}
      </View>
      </ScrollView>
    </SafeAreaScreen>
  );
}

function ActionButton({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.action, { borderColor: color + "66" }]}>
      <Text style={{ color, fontFamily: FontFamily.semibold, fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: Spacing.md },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { ...Typography.h4 },
  notice: { marginHorizontal: Spacing.lg, ...Typography.bodySmall },
  card: { marginHorizontal: Spacing.lg, padding: 16, borderRadius: Radius.lg, borderWidth: 1, gap: 12 },
  heading: { ...Typography.h4 },
  description: { ...Typography.bodySmall, lineHeight: 19 },
  label: { ...Typography.label },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  stack: { gap: 10, paddingVertical: 8 },
  flex: { flex: 1, minWidth: 0 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, ...Typography.body },
  action: { minHeight: 40, justifyContent: "center", alignItems: "center", paddingHorizontal: 12, borderWidth: 1, borderRadius: Radius.md },
  qr: { width: 192, height: 192, alignSelf: "center", backgroundColor: "#fff" },
  secret: { ...Typography.bodySmall, fontFamily: "monospace" },
  recovery: { padding: 12, borderWidth: 1, borderColor: "#d97706", borderRadius: Radius.md, gap: 10 },
  pairing: { gap: 8, paddingVertical: 8 },
  pairingCode: { ...Typography.h2, fontFamily: "monospace", letterSpacing: 8, textAlign: "center" },
});
