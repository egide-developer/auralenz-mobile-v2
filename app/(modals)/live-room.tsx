import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { useLiveRoomStore } from "../../src/stores/liveRoomStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily, FontSize } from "../../src/theme/typography";
import { Ionicons } from "@expo/vector-icons";
import { isLiveRoomAvailable } from "../../src/services/liveRoomMesh";

export default function LiveRoomScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const {
    activeRoomId,
    roomTitle,
    roomHostId,
    roomStatus,
    roomMaxParticipants,
    members,
    localUserId,
    localKind,
    localStream,
    localMuted,
    localCameraOff,
    isInRoom,
    leaveRoom,
    endRoom,
    setMuted,
    setCameraOff,
    markPeerConnectionFailed,
  } = useLiveRoomStore();

  const [mounted, setMounted] = useState(false);
  const localVideoRef = useRef<any>(null);
  const remoteVideoRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isInRoom && mounted && router.canGoBack()) {
      router.back();
    }
  }, [isInRoom, mounted, router]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      try {
        localVideoRef.current.srcObject = localStream;
      } catch {}
    }
  }, [localStream]);

  useEffect(() => {
    // Attach remote streams to video refs
    members.forEach((m) => {
      if (m.remoteStream && remoteVideoRefs.current.has(m.id)) {
        try {
          remoteVideoRefs.current.get(m.id).srcObject = m.remoteStream;
        } catch {}
      }
    });
  }, [members, localUserId]);

  const handleLeave = async () => {
    Alert.alert("Leave room?", "You will leave the live room. Others can continue.", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", onPress: leaveRoom, style: "destructive" },
    ]);
  };

  const handleEnd = async () => {
    Alert.alert("End room for everyone?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "End for all", onPress: endRoom, style: "destructive" },
    ]);
  };

  const isHost = roomHostId === currentUser?.id;

  if (!mounted || !isInRoom) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const otherMembers = members.filter((m) => m.id !== localUserId);
  const allParticipants = [localUserId, ...otherMembers.map((m) => m.id)];
  const participantCount = allParticipants.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PressableScale onPress={handleLeave}>
            <Icon name="chevron-left" set="light" size={26} color={colors.foreground} />
          </PressableScale>
          <View style={styles.titleWrap}>
            <Text style={[styles.roomTitle, { color: colors.foreground }]}>
              {roomTitle || "Live Room"}
            </Text>
            <Text style={[styles.roomMeta, { color: colors.mutedForeground }]}>
              {participantCount}/{roomMaxParticipants}
              {roomStatus === "ended" && " • ENDED"}
            </Text>
          </View>
        </View>
        {isHost && (
          <PressableScale onPress={handleEnd}>
            <Icon name="stop-circle" set="bold" size={26} color={colors.destructive} />
          </PressableScale>
        )}
      </View>

      {/* Video Grid */}
      <View style={styles.videoGrid}>
        {/* Local video (always first) */}
        <View style={styles.videoTile}>
          <View style={styles.localVideoWrap}>
            {localStream ? (
              <VideoView
                ref={localVideoRef}
                style={styles.video}
                muted={true}
                playsInline
              />
            ) : (
              <View style={[styles.videoPlaceholder, { backgroundColor: colors.muted }]}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.overlay}>
              <Text style={[styles.nameLabel, { color: colors.foreground }]}>
                You
              </Text>
              {localMuted && <Icon name="mic-off" set="bold" size={14} color={colors.foreground} />}
              {localCameraOff && localKind === "video" && (
                <Icon name="videocam-off" set="bold" size={14} color={colors.foreground} />
              )}
            </View>
          </View>
        </View>

        {/* Remote videos */}
        {otherMembers.map((member) => (
          <View key={member.id} style={styles.videoTile}>
            <View style={styles.remoteVideoWrap}>
              <VideoView
                ref={(ref: any) => {
                  if (ref) remoteVideoRefs.current.set(member.id, ref);
                }}
                style={styles.video}
                playsInline
              />
              {member.connectionFailed && (
                <View style={styles.reconnectBadge}>
                  <Text style={styles.reconnectText}>Reconnecting…</Text>
                </View>
              )}
              <View style={styles.overlay}>
                <Text style={[styles.nameLabel, { color: colors.foreground }]}>
                  {member.username}
                </Text>
                {member.isMuted && (
                  <Icon name="mic-off" set="bold" size={14} color={colors.foreground} />
                )}
                {member.isCameraOff && localKind === "video" && (
                  <Icon name="videocam-off" set="bold" size={14} color={colors.foreground} />
                )}
              </View>
            </View>
          </View>
        ))}

        {/* Empty slots up to maxParticipants */}
        {participantCount < roomMaxParticipants &&
          Array.from({ length: roomMaxParticipants - participantCount }, (_, i) => (
            <View key={`empty-${i}`} style={styles.videoTile}>
              <View style={[styles.emptySlot, { borderColor: colors.border }]}>
                <Icon name="person-add" set="light" size={32} color={colors.mutedForeground} />
              </View>
            </View>
          ))}
      </View>

      {/* Bottom Controls */}
      <View style={[styles.controls, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.controlRow}>
          <ControlButton
            icon={localMuted ? "mic-off" : "mic"}
            active={localMuted}
            onPress={() => setMuted(!localMuted)}
            color={colors}
            label="Mute"
          />
          <ControlButton
            icon={localCameraOff ? "videocam-off" : "videocam"}
            active={localCameraOff}
            onPress={() => setCameraOff(!localCameraOff)}
            color={colors}
            label={localKind === "video" ? "Camera" : "Video"}
          />
          {localKind === "video" && (
            <ControlButton
              icon="camera-reverse"
              active={false}
              onPress={() => {}}
              color={colors}
              label="Flip"
            />
          )}
          <ControlButton
            icon="people"
            active={false}
            onPress={() => {}}
            color={colors}
            label="Participants"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Helpers ───

function VideoView(
  props: React.ComponentProps<typeof View> & { ref?: any; muted?: boolean; playsInline?: boolean }
) {
  // Placeholder for RTCView (react-native-webrtc) in dev build.
  // The store attaches real streams via ref.srcObject.
  const { muted, playsInline, ...rest } = props;
  return <View {...rest} />;
}

function ControlButton({
  icon,
  active,
  onPress,
  color,
  label,
}: {
  icon: string;
  active: boolean;
  onPress: () => void;
  color: any;
  label: string;
}) {
  return (
    <PressableScale onPress={onPress} style={styles.controlBtn}>
      <View style={[
        styles.controlIconWrap,
        { backgroundColor: active ? color.primary : color.surface, borderColor: color.border },
      ]}>
        <Icon name={icon} set={active ? "bold" : "light"} size={24} color={active ? color.primaryForeground : color.foreground} />
      </View>
      <Text style={[styles.controlLabel, { color: color.foreground }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1 },
  titleWrap: { flex: 1, minWidth: 0 },
  roomTitle: { fontSize: FontSize.lg, fontWeight: "700", fontFamily: FontFamily.bold },
  roomMeta: { fontSize: FontSize.sm, marginTop: 2 },
  videoGrid: {
    flex: 1,
    padding: Spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  videoTile: {
    width: "50%",
    aspectRatio: 1,
    padding: 2,
  },
  localVideoWrap: { flex: 1, borderRadius: Radius.md, overflow: "hidden", position: "relative", backgroundColor: "#000" },
  remoteVideoWrap: { flex: 1, borderRadius: Radius.md, overflow: "hidden", position: "relative", backgroundColor: "#111" },
  video: { flex: 1 },
  videoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  reconnectBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    backgroundColor: "rgba(255,165,0,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignItems: "center",
  },
  reconnectText: { color: "#000", fontSize: 10, fontWeight: "600" },
  emptySlot: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", borderRadius: Radius.md },
  controls: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: "row", justifyContent: "space-around" },
  controlRow: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
  controlBtn: { alignItems: "center", gap: 4, minWidth: 60 },
  controlIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: { fontSize: 10, fontWeight: "500" },
});