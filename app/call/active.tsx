import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

export default function ActiveCallScreen() {
  const { conversationId, name, type, peerId } = useLocalSearchParams<{
    conversationId: string;
    name: string;
    type: "audio" | "video";
    peerId: string;
  }>();
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const isVideo = type === "video";

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isVideo && (
        <View style={[styles.remoteVideo, { backgroundColor: colors.muted }]}>
          <Ionicons name="person" size={64} color={colors.mutedForeground} />
        </View>
      )}

      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.foreground }]}>{name || "Call"}</Text>
        <Text style={[styles.timer, { color: colors.mutedForeground }]}>{formatTime(elapsed)}</Text>
      </View>

      {isVideo && (
        <View style={[styles.selfVideo, { backgroundColor: "#333" }]}>
          <Ionicons name="person" size={20} color="#fff" />
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: isMuted ? colors.primary : colors.muted }]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Ionicons
            name={isMuted ? "mic-off" : "mic"}
            size={22}
            color={isMuted ? colors.primaryForeground : colors.foreground}
          />
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: isCameraOn ? colors.muted : colors.primary }]}
            onPress={() => setIsCameraOn(!isCameraOn)}
          >
            <Ionicons
              name={isCameraOn ? "videocam" : "videocam-off"}
              size={22}
            color={isCameraOn ? colors.foreground : colors.primaryForeground}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: isSpeaker ? colors.primary : colors.muted }]}
          onPress={() => setIsSpeaker(!isSpeaker)}
        >
          <Ionicons
            name={isSpeaker ? "volume-high" : "volume-low"}
            size={22}
            color={isSpeaker ? colors.primaryForeground : colors.foreground}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: colors.muted }]}
          onPress={() => {
            // TODO: switch camera
          }}
        >
          <Ionicons name="camera-reverse" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.endCall, { backgroundColor: colors.destructive }]}
        onPress={() => router.back()}
      >
        <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", alignItems: "center" },
  remoteVideo: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", paddingTop: 70, zIndex: 10 },
  name: { fontSize: 22, fontWeight: "700" },
  timer: { fontSize: 15, marginTop: 4 },
  selfVideo: { position: "absolute", top: 80, right: 20, width: 100, height: 140, borderRadius: 16, alignItems: "center", justifyContent: "center", zIndex: 10 },
  controls: { flexDirection: "row", gap: 20, marginBottom: 32, zIndex: 10 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  endCall: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 48, zIndex: 10 },
});
