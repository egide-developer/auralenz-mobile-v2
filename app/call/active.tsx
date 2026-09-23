import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { useCallStore } from "../../src/stores/callStore";
import { getWebRTC } from "../../src/services/webrtc";
import { Colors } from "../../src/theme/colors";
import { FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";

function formatElapsed(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ActiveCallScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const status = useCallStore((s) => s.status);
  const kind = useCallStore((s) => s.kind);
  const remoteUser = useCallStore((s) => s.remoteUser);
  const isMuted = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const localStream = useCallStore((s) => s.localStream);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const startedAt = useCallStore((s) => s.startedAt);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const switchCamera = useCallStore((s) => s.switchCamera);
  const endCall = useCallStore((s) => s.endCall);
  const isVideo = kind === "video";
  const RTCView = useMemo(() => getWebRTC()?.RTCView ?? null, []);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Remote hung up / connection dropped.
  useEffect(() => {
    if (status === "idle") {
      router.back();
    }
  }, [status, router]);

  const handleEnd = () => {
    endCall();
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isVideo && RTCView ? (
        remoteStream ? (
          <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
        ) : (
          <View style={[styles.remoteVideo, { backgroundColor: colors.muted }]}>
            <Icon name="user" set="light" size={64} color={colors.mutedForeground} />
          </View>
        )
      ) : null}

      <View style={styles.header}>
        <Text style={[styles.name, { color: isVideo ? "#fff" : colors.foreground }]}>
          {remoteUser?.username || "Call"}
        </Text>
        <Text style={[styles.timer, { color: isVideo ? "#ffffffcc" : colors.mutedForeground }]}>
          {formatElapsed(elapsed)}
        </Text>
      </View>

      {!isVideo && (
        <View style={styles.audioAvatarWrap}>
          <View style={[styles.audioAvatar, { backgroundColor: colors.muted }]}>
            {remoteUser?.avatarUrl ? (
              <Image source={{ uri: remoteUser.avatarUrl }} style={styles.audioAvatarImg} />
            ) : (
              <Icon name="user" set="light" size={48} color={colors.mutedForeground} />
            )}
          </View>
        </View>
      )}

      {isVideo && RTCView && localStream && !isCameraOff && (
        <TouchableOpacity onPress={switchCamera} activeOpacity={0.85} style={styles.selfVideoWrap}>
          <RTCView streamURL={localStream.toURL()} style={styles.selfVideo} objectFit="cover" mirror zOrder={1} />
        </TouchableOpacity>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: isMuted ? colors.primary : colors.card }]}
          onPress={toggleMute}
        >
          <Icon
            name={isMuted ? "voice-2" : "voice"}
            set="light"
            size={22}
            color={isMuted ? colors.primaryForeground : colors.foreground}
          />
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: isCameraOff ? colors.primary : colors.card }]}
            onPress={toggleCamera}
          >
            <Icon
              name="video"
              set="light"
              size={22}
              color={isCameraOff ? colors.primaryForeground : colors.foreground}
            />
          </TouchableOpacity>
        )}

        {isVideo && (
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: colors.card }]}
            onPress={switchCamera}
          >
            <Icon name="swap" set="light" size={22} color={colors.foreground} />
          </TouchableOpacity>
        )}
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
  container: { flex: 1, justifyContent: "space-between", alignItems: "center" },
  remoteVideo: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", paddingTop: 70, zIndex: 10 },
  name: { fontFamily: FontFamily.bold, fontSize: 22 },
  timer: { fontFamily: FontFamily.regular, fontSize: 15, marginTop: 4 },
  audioAvatarWrap: { alignItems: "center", justifyContent: "center" },
  audioAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  audioAvatarImg: { width: 120, height: 120, borderRadius: 60 },
  selfVideoWrap: {
    position: "absolute",
    top: 80,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    zIndex: 10,
  },
  selfVideo: { width: "100%", height: "100%" },
  controls: { flexDirection: "row", gap: 20, marginBottom: 32, zIndex: 10 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  endCall: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 48, zIndex: 10 },
});
