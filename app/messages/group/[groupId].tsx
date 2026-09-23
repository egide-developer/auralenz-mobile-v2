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
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useThemeStore } from "../../../src/stores/themeStore";
import { useAuthStore } from "../../../src/stores/authStore";
import { Colors } from "../../../src/theme/colors";
import { Spacing, Radius } from "../../../src/theme/spacing";
import { Typography, FontFamily } from "../../../src/theme/typography";
import { Icon } from "../../../src/components/ui/Icon";
import api from "../../../src/api/client";
import { API } from "../../../src/api/endpoints";
import { onNewGroupMessage, markGroupRead } from "../../../src/services/socket";
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
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
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
        </View>
        <View style={styles.iconBtn} />
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

      <View style={[styles.inputRow, { borderTopColor: colors.border + "40", paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity onPress={pickImage} style={styles.iconBtn} hitSlop={8}>
          <Icon name="image" set="light" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
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
    borderBottomWidth: 0.5,
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
  textInput: {
    flex: 1,
    ...Typography.body,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
