import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

export default function OutgoingCallScreen() {
  const { conversationId, name, type } = useLocalSearchParams<{
    conversationId: string;
    name: string;
    type: "audio" | "video";
  }>();
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const isVideo = type === "video";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusArea}>
        <Text style={[styles.name, { color: colors.foreground }]}>{name || "Calling..."}</Text>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>Calling...</Text>
      </View>

      {isVideo && (
        <View style={[styles.videoPreview, { backgroundColor: colors.muted }]}>
          <Ionicons name="videocam-outline" size={48} color={colors.mutedForeground} />
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
          onPress={() => {
            // TODO: toggle mute
          }}
        >
          <Ionicons name="mic-outline" size={24} color={colors.foreground} />
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>Mute</Text>
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.muted }]}
            onPress={() => {
              // TODO: toggle camera
            }}
          >
            <Ionicons name="videocam-outline" size={24} color={colors.foreground} />
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>Camera</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
          onPress={() => {
            // TODO: switch camera
          }}
        >
          <Ionicons name="camera-reverse-outline" size={24} color={colors.foreground} />
          <Text style={[styles.actionLabel, { color: colors.foreground }]}>Flip</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.endCall, { backgroundColor: colors.destructive }]}
        onPress={() => router.back()}
      >
        <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  statusArea: { alignItems: "center" },
  name: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  status: { fontSize: 16 },
  videoPreview: { width: 200, height: 260, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: 24 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 11, marginTop: 4, fontWeight: "500" },
  endCall: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
