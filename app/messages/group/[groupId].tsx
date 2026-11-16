// Group chat — deliberately scoped to text + image messages for v1 (no
// voice-note recording or WebRTC calling here yet, unlike the 1:1 DM
// screen) so this ships as a solid, fully-working core instead of a
// half-wired clone of every DM feature.
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useThemeStore } from "../../../src/stores/themeStore";
import { useAuthStore } from "../../../src/stores/authStore";
import { showToast } from "../../../src/stores/toastStore";
import { Colors } from "../../../src/theme/colors";
import { Spacing, Radius } from "../../../src/theme/spacing";
import { Typography, FontFamily } from "../../../src/theme/typography";
import { Icon } from "../../../src/components/ui/Icon";
import { AiSummaryModal } from "../../../src/components/chat/AiSummaryModal";
import { Ionicons } from "@expo/vector-icons";
import api from "../../../src/api/client";
import { API } from "../../../src/api/endpoints";
import {
  onNewGroupMessage,
  markGroupRead,
  joinGroup,
  leaveGroup,
  onGroupTypingStart,
  onGroupTypingStop,
  onMessageUpdated,
  startGroupTyping,
  stopGroupTyping,
} from "../../../src/services/socket";
import type { ChatGroup, Message } from "../../../src/types";

function timeOf(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [pickedImage, setPickedImage] = useState<{ uri: string; mimeType: string; fileName: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  /** userId -> timestamp of their most recent typing event. */
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const typingSentAtRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const [{ data: groupData }, { data: msgData }] = await Promise.all([
        api.get(API.groups.byId(groupId)),
        api.get(API.groups.messages(groupId)),
      ]);
      setGroup(groupData.group || groupData);
      const list = msgData.messages || msgData.data || [];
      setMessages(Array.isArray(list) ? list : []);
    } catch {
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      api.put(API.groups.read(groupId)).catch(() => {});
      markGroupRead(groupId);
    }, [groupId])
  );

  // The server sends group typing indicators and AI transcription/summary
  // updates to the `group_<id>` room. Nothing reaches this screen until it
  // actually joins that room.
  useEffect(() => {
    joinGroup(groupId);
    return () => leaveGroup(groupId);
  }, [groupId]);

  useEffect(() => {
    const unsubscribe = onNewGroupMessage(({ message, groupId: incomingGroupId }) => {
      if (incomingGroupId !== groupId) return;
      setMessages((prev) => [...prev, message]);
      if (message.senderId !== currentUser?.id) {
        markGroupRead(groupId);
      }
    });
    return unsubscribe;
  }, [groupId, currentUser?.id]);

  // Audio messages are transcribed asynchronously, so the message is
  // replaced in place once the worker finishes.
  useEffect(() => {
    const unsubscribe = onMessageUpdated(({ message, groupId: incomingGroupId }) => {
      if (incomingGroupId && incomingGroupId !== groupId) return;
      const id = message?._id || message?.id;
      if (!id) return;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...message } : m)));
    });
    return unsubscribe;
  }, [groupId]);

  useEffect(() => {
    const clearFor = (userId: string) =>
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

    const unsubscribeStart = onGroupTypingStart(({ userId, groupId: incoming }) => {
      if (incoming !== groupId || userId === currentUser?.id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: Date.now() }));
      // A client that backgrounds mid-typing never sends the stop event, so
      // the indicator expires on its own rather than sticking forever.
      setTimeout(() => clearFor(userId), 6000);
    });

    const unsubscribeStop = onGroupTypingStop(({ userId, groupId: incoming }) => {
      if (incoming !== groupId) return;
      clearFor(userId);
    });

    return () => {
      unsubscribeStart?.();
      unsubscribeStop?.();
    };
  }, [groupId, currentUser?.id]);

  // Throttled so a fast typist sends one start event every few seconds
  // rather than one per keystroke, with a trailing stop once they pause.
  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      if (!value.trim()) return;

      const now = Date.now();
      if (now - typingSentAtRef.current > 3000) {
        typingSentAtRef.current = now;
        startGroupTyping(groupId);
      }

      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = setTimeout(() => {
        typingSentAtRef.current = 0;
        stopGroupTyping(groupId);
      }, 2500);
    },
    [groupId]
  );

  useEffect(
    () => () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    },
    []
  );

  const typingLabel = (() => {
    const ids = Object.keys(typingUsers);
    if (ids.length === 0) return null;
    const names = ids
      .map((id) => group?.participants.find((p) => p.id === id)?.username)
      .filter(Boolean) as string[];
    if (names.length === 0) return "Someone is typing…";
    if (names.length === 1) return `${names[0]} is typing…`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
    return `${names[0]} and ${names.length - 1} others are typing…`;
  })();

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;
    const a = result.assets[0];
    setPickedImage({ uri: a.uri, mimeType: a.mimeType || "image/jpeg", fileName: a.fileName || `img_${Date.now()}.jpg` });
  }, []);

  const send = useCallback(async () => {
    if (!text.trim() && !pickedImage) return;
    setSending(true);
    const formData = new FormData();
    if (text.trim()) formData.append("text", text.trim());
    if (pickedImage) {
      formData.append("images", { uri: pickedImage.uri, type: pickedImage.mimeType, name: pickedImage.fileName } as any);
    }
    try {
      const { data } = await api.post(API.groups.messages(groupId), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const sent = data.message || data;
      setMessages((prev) => [...prev, sent]);
      setText("");
      setPickedImage(null);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
    } finally {
      setSending(false);
    }
  }, [text, pickedImage, groupId]);

  const isAdmin =
    !!currentUser &&
    group?.participants.some((p) => p.id === currentUser.id && p.role === "admin");

  const leaveGroupNow = useCallback(() => {
    if (!currentUser) return;
    Alert.alert("Leave group", "You'll stop receiving messages from this group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(API.groups.leave(groupId, currentUser.id));
            showToast("You left the group", "info");
            router.dismissAll();
            router.replace("/(modals)/groups");
          } catch (e: any) {
            showToast(e?.response?.data?.message || "Could not leave the group", "error");
          }
        },
      },
    ]);
  }, [groupId, currentUser]);

  const deleteGroupNow = useCallback(() => {
    Alert.alert("Delete group", "This deletes the group and its messages for everyone. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(API.groups.remove(groupId));
            showToast("Group deleted", "info");
            router.dismissAll();
            router.replace("/(modals)/groups");
          } catch (e: any) {
            showToast(e?.response?.data?.message || "Could not delete the group", "error");
          }
        },
      },
    ]);
  }, [groupId]);

  const loadGroupDigest = useCallback(async () => {
    if (!groupId) return null;
    const { data } = await api.get(API.ai.groupDigest(groupId));
    const d = data.digest || null;
    return {
      summary: null,
      bulletPoints: d?.bulletPoints || [],
      decisions: d?.decisions || [],
      actionItems: d?.actionItems || [],
    };
  }, [groupId]);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 12 }]}>
        <Text style={{ color: colors.foreground }}>Group not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => router.push({ pathname: "/(modals)/group-info", params: { groupId } })}
        >
          <View style={[styles.headerAvatar, { backgroundColor: colors.muted }]}>
            {group.avatarUrl ? (
              <Image source={{ uri: group.avatarUrl }} style={styles.headerAvatarImg} />
            ) : (
              <Icon name="user" set="light" size={16} color={colors.mutedForeground} />
            )}
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              {group.participants.length} members
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: "/messages/search", params: { groupId, title: group.name } })
          }
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Icon name="search" set="light" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setHeaderMenuOpen(true)}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Icon name="more-square" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id || item.clientId || String(Math.random())}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMine = item.senderId === currentUser?.id;
          return (
            <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
              <View
                style={[
                  styles.bubble,
                  isMine ? { backgroundColor: colors.primary } : { backgroundColor: colors.card },
                ]}
              >
                {!isMine ? (
                  <Text style={[styles.senderName, { color: colors.primary }]}>{item.sender?.username}</Text>
                ) : null}
                {item.images && item.images.length > 0 ? (
                  <Image source={{ uri: item.images[0] }} style={styles.bubbleImage} resizeMode="cover" />
                ) : null}
                {item.text ? (
                  <Text style={[styles.bubbleText, { color: isMine ? colors.primaryForeground : colors.foreground }]}>
                    {item.text}
                  </Text>
                ) : null}
                <Text style={[styles.bubbleTime, { color: isMine ? colors.primaryForeground + "AA" : colors.mutedForeground }]}>
                  {timeOf(item.createdAt)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {pickedImage ? (
        <View style={[styles.previewRow, { borderTopColor: colors.border + "30" }]}>
          <Image source={{ uri: pickedImage.uri }} style={styles.previewImage} />
          <TouchableOpacity onPress={() => setPickedImage(null)} hitSlop={8}>
            <Icon name="close-square" set="bold" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ) : null}

      {typingLabel ? (
        <Text style={[styles.typingLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
          {typingLabel}
        </Text>
      ) : null}

      <View style={[styles.inputRow, { borderTopColor: colors.border + "40", paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity onPress={pickImage} style={styles.iconBtn} hitSlop={8}>
          <Icon name="image" set="light" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={handleTextChange}
          placeholder="Message..."
          placeholderTextColor={colors.mutedForeground + "80"}
          style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.card }]}
          multiline
        />
        <TouchableOpacity onPress={send} disabled={sending || (!text.trim() && !pickedImage)} style={styles.sendBtn}>
          {sending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="send" set="bold" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={headerMenuOpen}
        animationType="fade"
        onRequestClose={() => setHeaderMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setHeaderMenuOpen(false)}>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border + "40" }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setHeaderMenuOpen(false);
                setSummaryVisible(true);
              }}
            >
              <Ionicons name="sparkles" size={19} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>AI summary</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border + "40" }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setHeaderMenuOpen(false);
                router.push({ pathname: "/(modals)/group-info", params: { groupId } });
              }}
            >
              <Icon name="info-square" set="light" size={20} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Group info</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border + "40" }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setHeaderMenuOpen(false);
                leaveGroupNow();
              }}
            >
              <Icon name="logout" set="light" size={20} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Leave group</Text>
            </TouchableOpacity>
            {isAdmin && (
              <>
                <View style={[styles.menuDivider, { backgroundColor: colors.border + "40" }]} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setHeaderMenuOpen(false);
                    deleteGroupNow();
                  }}
                >
                  <Icon name="delete" set="light" size={20} color={colors.destructive} />
                  <Text style={[styles.menuItemText, { color: colors.destructive }]}>Delete group</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <AiSummaryModal
        visible={summaryVisible}
        title={`Summary — ${group.name}`}
        onClose={() => setSummaryVisible(false)}
        loadSummary={loadGroupDigest}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  headerAvatarImg: { width: 36, height: 36 },
  headerTitle: { fontFamily: FontFamily.semibold, fontSize: 15 },
  headerSubtitle: { ...Typography.caption },
  listContent: { padding: Spacing.base, gap: 8 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: Radius.lg, padding: 10 },
  senderName: { fontSize: 12, fontFamily: FontFamily.semibold, marginBottom: 2 },
  bubbleImage: { width: 200, height: 200, borderRadius: Radius.md, marginBottom: 6 },
  bubbleText: { ...Typography.bodySmall },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: Spacing.base, paddingTop: 8, borderTopWidth: 0.5 },
  previewImage: { width: 44, height: 44, borderRadius: Radius.sm },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.base,
    paddingTop: 8,
    borderTopWidth: 0.5,
    gap: 8,
  },
  typingLabel: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 4,
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  menuBackdrop: { flex: 1, backgroundColor: "#00000055", justifyContent: "flex-end" },
  menuCard: {
    borderTopLeftRadius: Radius["2xl"],
    borderTopRightRadius: Radius["2xl"],
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 0.5,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  menuDivider: { height: StyleSheet.hairlineWidth },
  menuItemText: { fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 21 },
});
