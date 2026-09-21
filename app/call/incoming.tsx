import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

export default function IncomingCallScreen() {
  const { conversationId, name, type, callerId } = useLocalSearchParams<{
    conversationId: string;
    name: string;
    type: "audio" | "video";
    callerId: string;
  }>();
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const handleAccept = () => {
    router.replace({
      pathname: "/call/active",
      params: { conversationId, name, type, peerId: callerId },
    });
  };

  const handleDecline = () => {
    // TODO: send decline via socket
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.info}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          <Ionicons name="person" size={40} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{name || "Unknown"}</Text>
        <Text style={[styles.type, { color: colors.mutedForeground }]}>
          Incoming {type === "video" ? "Video" : "Audio"} Call
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.declineBtn, { backgroundColor: colors.destructive }]} onPress={handleDecline}>
          <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.success }]} onPress={handleAccept}>
          <Ionicons name="call" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", alignItems: "center", paddingVertical: 80, paddingHorizontal: 24 },
  info: { alignItems: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  name: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  type: { fontSize: 16 },
  actions: { flexDirection: "row", gap: 48 },
  declineBtn: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  acceptBtn: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
});
