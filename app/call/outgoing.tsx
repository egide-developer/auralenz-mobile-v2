import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { useCallStore } from "../../src/stores/callStore";
import { Colors } from "../../src/theme/colors";
import { FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";

export default function OutgoingCallScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const status = useCallStore((s) => s.status);
  const kind = useCallStore((s) => s.kind);
  const remoteUser = useCallStore((s) => s.remoteUser);
  const isMuted = useCallStore((s) => s.isMuted);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const endCall = useCallStore((s) => s.endCall);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (status === "in_call" && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.replace("/call/active");
    }
    // Declined / failed / hung up before it connected.
    if (status === "idle" && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.back();
    }
  }, [status, router]);

  const handleEnd = () => {
    hasNavigatedRef.current = true;
    endCall();
    router.back();
  };

  const isVideo = kind === "video";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusArea}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          {remoteUser?.avatarUrl ? (
            <Image source={{ uri: remoteUser.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Icon name="user" set="light" size={40} color={colors.mutedForeground} />
          )}
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{remoteUser?.username || "Calling..."}</Text>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>
          {isVideo ? "Video calling..." : "Calling..."}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: isMuted ? colors.primary : colors.muted }]}
          onPress={toggleMute}
        >
          <Icon
            name={isMuted ? "voice-2" : "voice"}
            set="light"
            size={22}
            color={isMuted ? colors.primaryForeground : colors.foreground}
          />
          <Text style={[styles.actionLabel, { color: isMuted ? colors.primaryForeground : colors.foreground }]}>
            {isMuted ? "Unmute" : "Mute"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.endCall, { backgroundColor: colors.destructive }]}
        onPress={handleEnd}
      >
        <Icon name="call" set="bold" size={26} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  statusArea: { alignItems: "center" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  name: { fontFamily: FontFamily.bold, fontSize: 28, marginBottom: 4 },
  status: { fontFamily: FontFamily.regular, fontSize: 16 },
  actions: { flexDirection: "row", gap: 24 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontFamily: FontFamily.medium, fontSize: 11, marginTop: 4 },
  endCall: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
