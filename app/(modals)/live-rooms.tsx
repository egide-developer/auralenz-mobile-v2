import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
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
import { FontSize, FontFamily, Typography } from "../../src/theme/typography";
import { AppIcon } from "../../src/components/ui/AppIcon";
import { icons } from "../../src/constants/icons";
import { isLiveRoomAvailable } from "../../src/services/liveRoomMesh";

export default function LiveRoomsModal() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const { rooms, roomsLoading, roomsError, fetchRooms, createRoom, joinRoom } =
    useLiveRoomStore();

  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinPrompt, setJoinPrompt] = useState<{ id: string; title: string } | null>(null);

  const loadRooms = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  }, [fetchRooms]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const room = await createRoom(name.trim(), topic.trim() || undefined);
    setCreating(false);
    if (room) {
      setCreateOpen(false);
      setName("");
      setTopic("");
      Alert.alert("Room created", "Tap the room to go live");
    }
  };

  const handleJoin = async (roomId: string, title: string) => {
    if (!isLiveRoomAvailable()) {
      Alert.alert(
        "Live Rooms unavailable",
        "Audio/video rooms need a custom development build (react-native-webrtc isn't available in Expo Go). Build a dev client to use this."
      );
      return;
    }
    if (!currentUser) {
      Alert.alert("Please log in first");
      return;
    }
    await joinRoom(roomId, "video");
    router.push("/(modals)/live-room");
  };

  const renderRoom = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.roomCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setJoinPrompt({ id: item.id, title: item.title })}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleWrap}>
          <Text style={[styles.roomTitle, { color: colors.foreground }]}>
            {item.title}
          </Text>
          {item.topic && (
            <Text style={[styles.roomTopic, { color: colors.mutedForeground }]}>
              {item.topic}
            </Text>
          )}
        </View>
        <View style={styles.roomMeta}>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {item.participantsCount}/{item.maxParticipants}
          </Text>
          {item.host.id === currentUser?.id && (
            <AppIcon icon={icons.person} size={16} color={colors.primary}  />
          )}
        </View>
      </View>
      <View style={[styles.roomFooter, { borderTopColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <CachedImage
            source={{ uri: item.host.avatarUrl }}
            style={styles.avatarImage}
          />
          <Text style={styles.avatarFallback}>
            {item.host.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.hostName, { color: colors.foreground }]}>
          {item.host.username}
        </Text>
        {item.status === "ended" && (
          <View style={styles.endedBadge}>
            <Text style={styles.endedText}>ENDED</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: FontFamily.bold }]}>
          Live Rooms
        </Text>
        <PressableScale onPress={() => setCreateOpen(true)}>
          <Icon name="add" set="light" size={24} color={colors.foreground} />
        </PressableScale>
      </View>

      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadRooms}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !roomsLoading ? (
            <View style={[styles.empty, { backgroundColor: colors.background }]}>
              <Icon name="people" set="light" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No live rooms yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Tap + to start your own
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Create Modal */}
      <Modal visible={createOpen} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Start Live Room
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Title (required)"
              value={name}
              onChangeText={setName}
              maxLength={120}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Topic (optional)"
              value={topic}
              onChangeText={setTopic}
              maxLength={200}
            />
            <View style={styles.modalActions}>
              <PressableScale onPress={() => { setCreateOpen(false); setName(""); setTopic(""); }}>
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </PressableScale>
              <PressableScale
                onPress={handleCreate}
                disabled={creating || !name.trim()}
              >
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: creating || !name.trim() ? colors.mutedForeground : colors.primary },
                  ]}
                >
                  {creating ? "Creating…" : "Create & Go Live"}
                </Text>
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join Confirmation */}
      <Modal visible={!!joinPrompt} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Join "{joinPrompt?.title}"?
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              You will enter with camera & microphone. Mesh audio/video caps at 8 participants.
            </Text>
            <View style={styles.modalActions}>
              <PressableScale onPress={() => setJoinPrompt(null)}>
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </PressableScale>
              <PressableScale onPress={() => { handleJoin(joinPrompt!.id, joinPrompt!.title); setJoinPrompt(null); }}>
                <Text style={[styles.modalBtnText, { color: colors.primary }]}>Join</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  headerTitle: { fontSize: FontSize.xl, fontWeight: "700", fontFamily: FontFamily.bold },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  roomCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  roomTitleWrap: { flex: 1 },
  roomTitle: { fontSize: FontSize.lg, fontWeight: "600", marginBottom: 2 },
  roomTopic: { fontSize: FontSize.sm },
  roomMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: { fontSize: FontSize.sm, fontWeight: "500" },
  roomFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: { position: "absolute", fontSize: FontSize.sm, fontWeight: "600", color: "#FFFFFF" },
  hostName: { fontSize: FontSize.sm, fontWeight: "500", flex: 1 },
  endedBadge: { backgroundColor: "#EF4444", paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  endedText: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  emptyText: { fontSize: FontSize.lg, fontWeight: "600", marginTop: Spacing.md },
  emptySub: { fontSize: FontSize.sm, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: "center", paddingHorizontal: Spacing.md, backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { borderRadius: Radius.lg, padding: Spacing.lg, width: "100%" },
  modalTitle: { fontSize: FontSize.lg, fontWeight: "700", marginBottom: Spacing.md },
  modalSub: { fontSize: FontSize.sm, marginBottom: Spacing.md, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm, marginTop: Spacing.md },
  modalBtnText: { fontSize: FontSize.md, fontWeight: "600" },
});