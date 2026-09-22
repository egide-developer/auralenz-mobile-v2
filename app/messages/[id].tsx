import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { joinConversation, leaveConversation, onNewMessage, onMessagesRead } from "../../src/services/socket";
import { useUnreadStore } from "../../src/stores/unreadStore";
import type { Conversation, Message } from "../../src/types";

const GROUP_GAP_MS = 5 * 60 * 1000;
const PAGE_SIZE = 20;

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "long", day: "numeric" });
}

interface Row {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  showTail: boolean;
  showTime: boolean;
  dayLabel?: string;
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const recentlySentIds = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const isPrependingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const other = conversation?.user;
  const displayName = other?.username || "Chat";
  const avatarUrl = other?.avatarUrl;

  useEffect(() => {
    if (!id) return;
    setPage(1);
    setHasMore(false);
    isInitialLoadRef.current = true;
    loadingMoreRef.current = false;
    (async () => {
      try {
        const { data } = await api.get(API.messages.messages(id), {
          params: { page: 1, limit: PAGE_SIZE },
        });
        setMessages(data.data || data.messages || data || []);
        setHasMore(Boolean(data.pagination?.hasMore));
      } catch {}
      try {
        const { data } = await api.get(API.messages.conversations);
        const list: Conversation[] = data.data || data.conversations || data || [];
        const found = list.find((c) => c.id === id) || null;
        if (found?.user) {
          const rawUser = found.user as any;
          found.user = { ...found.user, id: rawUser.id || rawUser._id };
        }
        setConversation(found);
      } catch {}
      api.post(API.messages.read(id)).catch(() => {});
      useUnreadStore.getState().clearConversationUnread(id);
    })();

    joinConversation(id);
    const unsubNewMessage = onNewMessage((data) => {
      if (data.conversationId !== id) return;
      const incoming: Message = data.message;

      if (incoming.senderId === user?.id) {
        // Own message echoed back over the socket. If it's already been
        // reconciled (or is about to be) by the REST response in send(),
        // never append a second copy — just let that path own it.
        if (recentlySentIds.current.has(incoming.id)) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          if (prev.some((m) => m.pending)) return prev; // an optimistic send is still in flight
          return [...prev, incoming];
        });
        return;
      }

      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
      api.post(API.messages.read(id)).catch(() => {});
      useUnreadStore.getState().clearConversationUnread(id);
    });
    const unsubRead = onMessagesRead((data) => {
      if (data.conversationId !== id) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (!m.id || !data.messageIds.includes(m.id)) return m;
          const readBy = m.readBy || [];
          if (readBy.some((r) => r.user === data.readBy)) return m;
          return { ...m, readBy: [...readBy, { user: data.readBy, readAt: new Date().toISOString() }] };
        })
      );
    });

    return () => {
      leaveConversation(id);
      unsubNewMessage?.();
      unsubRead?.();
    };
  }, [id]);

  const loadMore = useCallback(async () => {
    if (!id || loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { data } = await api.get(API.messages.messages(id), {
        params: { page: nextPage, limit: PAGE_SIZE },
      });
      const older: Message[] = data.data || data.messages || data || [];
      if (older.length > 0) {
        isPrependingRef.current = true;
        setMessages((prev) => [...older, ...prev]);
      }
      setPage(nextPage);
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch {
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [id, page, hasMore]);

  const handleScroll = (e: any) => {
    if (e.nativeEvent.contentOffset.y < 80) {
      loadMore();
    }
  };

  const send = async () => {
    if (!text.trim() || !id || sending || !user) return;
    const msg = text.trim();
    const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setText("");
    setSending(true);

    const optimistic: Message = {
      id: "",
      clientId,
      conversationId: id,
      senderId: user.id,
      sender: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
      },
      text: msg,
      images: [],
      messageType: "text",
      reactions: [],
      readBy: [],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data } = await api.post(API.messages.send(id), { text: msg });
      const sent: Message = data.message || data.data || data;
      if (sent.id) {
        recentlySentIds.current.add(sent.id);
        setTimeout(() => recentlySentIds.current.delete(sent.id), 10000);
      }
      // Merge the confirmed message into the SAME row (same clientId key) —
      // never a second push. This is what makes it "no rerender, just a status update."
      setMessages((prev) =>
        prev.map((m) => (m.clientId === clientId ? { ...sent, clientId } : m))
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientId === clientId ? { ...m, pending: false, failed: true } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const rows: Row[] = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const isMine = m.senderId === user?.id;
      const sameAsNext = next && next.senderId === m.senderId &&
        new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() < GROUP_GAP_MS;
      const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
      return {
        message: m,
        isMine,
        showAvatar: !isMine && !sameAsNext,
        showTail: !sameAsNext,
        showTime: !sameAsNext,
        dayLabel: newDay ? formatDayLabel(m.createdAt) : undefined,
      };
    });
  }, [messages, user?.id]);

  const lastMineIndex = useMemo(() => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].isMine) return i;
    return -1;
  }, [rows]);

  const isSeen =
    other && rows[lastMineIndex]?.message.readBy?.some((r) => r.user === other.id);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.muted }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.headerAvatarImg} />
            ) : (
              <Icon name="user" set="light" size={16} color={colors.mutedForeground} />
            )}
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
            <Icon name="call" set="light" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
            <Icon name="video" set="light" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={rows}
        keyExtractor={(item, index) => item.message.clientId || item.message.id || `pending-${index}`}
        contentContainerStyle={styles.messageList}
        onScroll={handleScroll}
        scrollEventThrottle={150}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        ListHeaderComponent={
          loadingMore ? (
            <View style={styles.loadMoreWrap}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          ) : null
        }
        onContentSizeChange={() => {
          if (isPrependingRef.current) {
            isPrependingRef.current = false;
            return;
          }
          flatListRef.current?.scrollToEnd({ animated: !isInitialLoadRef.current });
          isInitialLoadRef.current = false;
        }}
        renderItem={({ item, index }) => {
          const { message, isMine, showAvatar, showTail, showTime, dayLabel } = item;
          const hasImages = !message.isDeleted && message.images?.length > 0;
          return (
            <View>
              {dayLabel && (
                <Animated.View entering={FadeIn.duration(250)} style={styles.dayLabelWrap}>
                  <Text style={[styles.dayLabel, { color: colors.mutedForeground, backgroundColor: colors.card }]}>
                    {dayLabel}
                  </Text>
                </Animated.View>
              )}
              <Animated.View
                entering={FadeInUp.duration(220)}
                style={[
                  styles.messageRow,
                  isMine ? styles.messageRowMe : styles.messageRowThem,
                  !showTail && { marginBottom: 2 },
                ]}
              >
                {!isMine && (
                  <View style={styles.avatarSlot}>
                    {showAvatar ? (
                      <View style={[styles.msgAvatar, { backgroundColor: colors.muted }]}>
                        {other?.avatarUrl ? (
                          <Image source={{ uri: other.avatarUrl }} style={styles.msgAvatarImg} />
                        ) : (
                          <Icon name="user" set="light" size={12} color={colors.mutedForeground} />
                        )}
                      </View>
                    ) : null}
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    hasImages && styles.bubbleWithImages,
                    isMine
                      ? [
                          styles.bubbleMe,
                          { backgroundColor: colors.primary },
                          showTail ? styles.bubbleMeTail : styles.bubbleMeStack,
                        ]
                      : [
                          styles.bubbleThem,
                          { backgroundColor: colors.card, borderColor: colors.border + "30" },
                          showTail ? styles.bubbleThemTail : styles.bubbleThemStack,
                        ],
                  ]}
                >
                  {hasImages && (
                    <View style={styles.imageGrid}>
                      {message.images.map((uri: string, i: number) => (
                        <Image
                          key={i}
                          source={{ uri }}
                          style={[
                            styles.chatImage,
                            message.images.length > 1 && styles.chatImageMulti,
                          ]}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  )}
                  {(!hasImages || !!message.text) && (
                    <Text
                      style={{
                        color: isMine ? colors.primaryForeground : colors.foreground,
                        ...Typography.body,
                        lineHeight: 20,
                        marginTop: hasImages ? 6 : 0,
                        marginHorizontal: hasImages ? 4 : 0,
                      }}
                    >
                      {message.isDeleted ? "Message deleted" : message.text}
                    </Text>
                  )}
                </View>
              </Animated.View>
              {showTime && (
                <Text
                  style={[
                    styles.timeLabel,
                    { color: colors.mutedForeground },
                    isMine ? styles.timeLabelMe : styles.timeLabelThem,
                  ]}
                >
                  {formatTime(message.createdAt)}
                </Text>
              )}
              {isMine && (message.pending || message.failed) && (
                <Text
                  style={[
                    styles.seenLabel,
                    { color: message.failed ? Colors.light.destructive : colors.mutedForeground },
                  ]}
                >
                  {message.failed ? "Failed to send" : "Sending…"}
                </Text>
              )}
              {isMine && !message.pending && !message.failed && index === lastMineIndex && (
                <Text style={[styles.seenLabel, { color: colors.mutedForeground }]}>
                  {isSeen ? "Seen" : "Sent"}
                </Text>
              )}
            </View>
          );
        }}
      />

      <View style={[styles.inputBar, { borderTopColor: colors.border + "40", backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.attachBtn} hitSlop={6}>
          <Icon name="camera" set="light" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.mutedForeground + "80"}
          multiline
          maxLength={2000}
          style={[
            styles.chatInput,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: colors.border + "40",
            },
          ]}
        />
        <PressableScale
          onPress={send}
          disabled={!text.trim() || sending}
          scaleTo={0.85}
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted }]}
        >
          <Icon
            name="send"
            set="bold"
            size={18}
            color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
          />
        </PressableScale>
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
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImg: { width: 30, height: 30, borderRadius: 15 },
  headerTitle: { ...Typography.h4, maxWidth: 160 },
  headerActions: { flexDirection: "row", gap: 4 },
  messageList: { padding: Spacing.base, flexGrow: 1, justifyContent: "flex-end" },
  loadMoreWrap: { paddingVertical: 12, alignItems: "center" },
  dayLabelWrap: { alignItems: "center", marginVertical: 12 },
  dayLabel: {
    ...Typography.caption,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 2 },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowThem: { justifyContent: "flex-start" },
  avatarSlot: { width: 24, marginRight: 6 },
  msgAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  msgAvatarImg: { width: 22, height: 22, borderRadius: 11 },
  bubble: { maxWidth: "76%", paddingHorizontal: 14, paddingVertical: 10 },
  bubbleWithImages: { padding: 4, overflow: "hidden" },
  bubbleMe: {},
  bubbleThem: { borderWidth: 1 },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3 },
  chatImage: { width: 200, height: 200, borderRadius: Radius.md },
  chatImageMulti: { width: 98, height: 98 },
  bubbleMeTail: {
    borderRadius: Radius.xl,
    borderBottomRightRadius: 4,
  },
  bubbleMeStack: {
    borderRadius: Radius.xl,
  },
  bubbleThemTail: {
    borderRadius: Radius.xl,
    borderBottomLeftRadius: 4,
  },
  bubbleThemStack: {
    borderRadius: Radius.xl,
  },
  timeLabel: { ...Typography.caption, fontSize: 10, marginBottom: 8, marginTop: -2 },
  timeLabelMe: { alignSelf: "flex-end", marginRight: 4 },
  timeLabelThem: { alignSelf: "flex-start", marginLeft: 34 },
  seenLabel: {
    ...Typography.caption,
    fontSize: 10,
    alignSelf: "flex-end",
    marginRight: 4,
    marginTop: -6,
    marginBottom: 8,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
    gap: 8,
  },
  attachBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Typography.body,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
