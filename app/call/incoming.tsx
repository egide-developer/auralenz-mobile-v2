import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { useCallStore } from "../../src/stores/callStore";
import { Colors } from "../../src/theme/colors";
import { FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";

export default function IncomingCallScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const status = useCallStore((s) => s.status);
  const kind = useCallStore((s) => s.kind);
  const remoteUser = useCallStore((s) => s.remoteUser);
  const acceptCall = useCallStore((s) => s.acceptCall);
  const declineCall = useCallStore((s) => s.declineCall);
  const hasNavigatedRef = useRef(false);

  // The caller hung up / the call was answered on another device before we responded.
  useEffect(() => {
    if (status === "idle" && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.back();
    }
    if (status === "in_call" && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.replace("/call/active");
    }
  }, [status, router]);

  const handleAccept = async () => {
    hasNavigatedRef.current = true;
    await acceptCall();
    router.replace("/call/active");
  };

  const handleDecline = () => {
    hasNavigatedRef.current = true;
    declineCall();
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.info}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          {remoteUser?.avatarUrl ? (
            <Image source={{ uri: remoteUser.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Icon name="user" set="light" size={40} color={colors.mutedForeground} />
          )}
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{remoteUser?.username || "Unknown"}</Text>
        <Text style={[styles.type, { color: colors.mutedForeground }]}>
          Incoming {kind === "video" ? "Video" : "Audio"} Call
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.declineBtn, { backgroundColor: colors.destructive }]} onPress={handleDecline}>
          <Icon name="call" set="bold" size={26} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.success }]} onPress={handleAccept}>
          <Icon name="call" set="bold" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", alignItems: "center", paddingVertical: 80, paddingHorizontal: 24 },
  info: { alignItems: "center" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  name: { fontFamily: FontFamily.bold, fontSize: 28, marginBottom: 4 },
  type: { fontFamily: FontFamily.regular, fontSize: 16 },
  actions: { flexDirection: "row", gap: 48 },
  declineBtn: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  acceptBtn: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
});
