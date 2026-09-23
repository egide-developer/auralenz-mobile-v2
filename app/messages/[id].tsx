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
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Keyboard,
} from "react-native";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import Animated, {
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily, FontSize } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { UserLink } from "../../src/components/ui/UserLink";
import { PressableScale } from "../../src/components/ui/PressableScale";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import {
  joinConversation,
  leaveConversation,
  onNewMessage,
  onMessagesRead,
  startTyping,
  stopTyping,
  onTypingStart,
  onTypingStop,
} from "../../src/services/socket";
import { useUnreadStore } from "../../src/stores/unreadStore";
import { useCallStore } from "../../src/stores/callStore";
import type { Conversation, Message } from "../../src/types";

const GROUP_GAP_MS = 5 * 60 * 1000;
const PAGE_SIZE = 20;
const NEAR_BOTTOM_THRESHOLD = 120;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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

function formatAudioTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface Row {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  showTail: boolean;
  showTime: boolean;
  dayLabel?: string;
}

interface PendingAttachment {
  id: string;
  kind: "image" | "file";
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

const WAVEFORM_BAR_COUNT = 26;

// The backend doesn't hand back real decoded amplitude data, so this derives
// a stable-but-distinct-per-message bar pattern from the audio URL itself —
// same message always renders the same "waveform" shape instead of
// reshuffling on every re-render, without needing to analyze the file.
function waveformHeights(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const heights: number[] = [];
  for (let i = 0; i < WAVEFORM_BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const t = (h % 1000) / 1000;
    // Bias toward mid-range heights so it reads as a voice waveform, not noise.
    heights.push(4 + Math.round((0.35 + 0.65 * t) * 14));
  }
  return heights;
}

function AudioBubbleContent({
  uri,
  isMine,
  colors,
  fallbackDurationSec,
}: {
  uri: string;
  isMine: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
  fallbackDurationSec?: number | null;
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || fallbackDurationSec || 0;
  const finished = !status.playing && duration > 0 && status.currentTime >= duration - 0.15;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const tint = isMine ? colors.primaryForeground : colors.primary;
  const bars = useMemo(() => waveformHeights(uri), [uri]);
  const playedBars = Math.round(progress * bars.length);

  const toggle = useCallback(() => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (finished) {
      player.seekTo(0).finally(() => player.play());
      return;
    }
    player.play();
  }, [status.playing, finished, player]);

  return (
    <TouchableOpacity onPress={toggle} style={styles.audioRow} hitSlop={6} activeOpacity={0.8}>
      <View style={[styles.audioPlayBtn, { backgroundColor: isMine ? "#FFFFFF33" : colors.primary + "18" }]}>
        {status.playing ? (
          <View style={[styles.audioPauseIcon, { backgroundColor: tint }]} />
        ) : (
          <Icon name="play" set="bold" size={13} color={tint} />
        )}
      </View>
      <View style={styles.waveform}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={[
              styles.waveformBar,
              {
                height: h,
                backgroundColor:
                  i < playedBars ? tint : isMine ? "#FFFFFF40" : colors.border + "70",
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.audioDuration, { color: isMine ? colors.primaryForeground : colors.mutedForeground }]}>
        {formatAudioTime(status.playing || status.currentTime > 0 ? status.currentTime : duration)}
      </Text>
    </TouchableOpacity>
  );
}

const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 72;

function MessageRow({
  item,
  index,
  colors,
  other,
  isSeen,
  lastMineIndex,
  onSwipeReply,
}: {
  item: Row;
  index: number;
  colors: typeof Colors.light | typeof Colors.dark;
  other: Conversation["user"] | undefined;
  isSeen: boolean | undefined;
  lastMineIndex: number;
  onSwipeReply: (message: Message) => void;
}) {
  const { message, isMine, showAvatar, showTail, showTime, dayLabel } = item;
  const hasImages = !message.isDeleted && message.images?.length > 0;
  const hasAudio = !message.isDeleted && !!message.audioUrl;
  const hasFiles = !message.isDeleted && (message.files?.length || 0) > 0;
  const replyTo = message.replyTo;

  const translateX = useSharedValue(0);
  const iconOpacity = useSharedValue(0);

  const triggerReply = useCallback(() => {
    onSwipeReply(message);
  }, [onSwipeReply, message]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(isMine ? [-15, 999] : [-999, 15])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          if (message.isDeleted) return;
          // Both directions swipe toward the reply icon (left for mine, right for theirs)
          const raw = isMine ? Math.min(0, e.translationX) : Math.max(0, e.translationX);
          const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, raw));
          translateX.value = clamped;
          iconOpacity.value = Math.min(1, Math.abs(clamped) / SWIPE_THRESHOLD);
        })
        .onEnd((e) => {
          const raw = isMine ? Math.min(0, e.translationX) : Math.max(0, e.translationX);
          if (!message.isDeleted && Math.abs(raw) >= SWIPE_THRESHOLD) {
            runOnJS(triggerReply)();
          }
          translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
          iconOpacity.value = withSpring(0);
        }),
    [isMine, message.isDeleted, triggerReply]
  );

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: 0.6 + iconOpacity.value * 0.4 }],
  }));

  return (
    <View>
      {dayLabel && (
        <Animated.View entering={FadeIn.duration(250)} style={styles.dayLabelWrap}>
          <Text style={[styles.dayLabel, { color: colors.mutedForeground, backgroundColor: colors.card }]}>
            {dayLabel}
          </Text>
        </Animated.View>
      )}
      <GestureDetector gesture={panGesture}>
        <Animated.View entering={FadeInUp.duration(220)} style={styles.swipeWrap}>
          <Animated.View
            style={[
              styles.replyIconWrap,
              isMine ? styles.replyIconWrapMe : styles.replyIconWrapThem,
              iconAnimatedStyle,
            ]}
          >
            <Icon name="arrow-left-2" set="bold" size={16} color={colors.primary} />
          </Animated.View>
          <Animated.View
            style={[
              styles.messageRow,
              isMine ? styles.messageRowMe : styles.messageRowThem,
              !showTail && { marginBottom: 2 },
              rowAnimatedStyle,
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
              {replyTo && (
                <View
                  style={[
                    styles.quotedBlock,
                    {
                      borderLeftColor: isMine ? colors.primaryForeground + "80" : colors.primary,
                      backgroundColor: isMine ? "#FFFFFF22" : colors.background + "80",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quotedSender,
                      { color: isMine ? colors.primaryForeground : colors.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {replyTo.sender?.username || "Message"}
                  </Text>
                  <Text
                    style={[
                      styles.quotedText,
                      { color: isMine ? colors.primaryForeground + "CC" : colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {replyTo.isDeleted ? "Message deleted" : replyTo.text}
                  </Text>
                </View>
              )}
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
              {hasAudio && (
                <AudioBubbleContent
                  uri={message.audioUrl!}
                  isMine={isMine}
                  colors={colors}
                  fallbackDurationSec={message.audioDuration}
                />
              )}
              {hasFiles && (
                <View style={styles.fileList}>
                  {message.files!.map((f, i) => (
                    <View
                      key={i}
                      style={[
                        styles.fileChip,
                        { backgroundColor: isMine ? "#FFFFFF22" : colors.background + "80" },
                      ]}
                    >
                      <Icon
                        name="document"
                        set="light"
                        size={16}
                        color={isMine ? colors.primaryForeground : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.fileName,
                          { color: isMine ? colors.primaryForeground : colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {f.originalName || "File"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {!message.isDeleted && !!message.text && (
                <Text
                  style={{
                    color: isMine ? colors.primaryForeground : colors.foreground,
                    ...Typography.body,
                    lineHeight: 20,
                    marginTop: hasImages || hasAudio || hasFiles ? 6 : 0,
                    marginHorizontal: hasImages ? 4 : 0,
                  }}
                >
                  {message.text}
                </Text>
              )}
              {message.isDeleted && (
                <Text
                  style={{
                    color: isMine ? colors.primaryForeground : colors.foreground,
                    ...Typography.body,
                    lineHeight: 20,
                  }}
                >
                  Message deleted
                </Text>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
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
}

// Mirrors frontend's .typing-indicator (src/index.css): 3 dots, scale 0.75→1.2,
// opacity 0.55→1, 640ms cycle, 200ms/400ms staggered delays — no bubble wrapper.
function TypingDot({ delay, color }: { delay: number; color: string }) {
  const scale = useSharedValue(0.75);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1.2, { duration: 256 }), withTiming(0.75, { duration: 384 })), -1)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 256 }), withTiming(0.55, { duration: 384 })), -1)
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, style]} />;
}

function TypingDots({ color }: { color: string }) {
  return (
    <View style={styles.typingDotsRow}>
      <TypingDot delay={0} color={color} />
      <TypingDot delay={200} color={color} />
      <TypingDot delay={400} color={color} />
    </View>
  );
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const recentlySentIds = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const isPrependingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTargetIndexRef = useRef<number | null>(null);
  const isNearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);

  const other = conversation?.user;
  const displayName = other?.username || "Chat";
  const avatarUrl = other?.avatarUrl;

  // Only pad the input bar for the bottom safe area (home indicator / gesture
  // bar) while the keyboard is hidden — once it's up, the keyboard itself is
  // the "bottom", so adding the inset on top of it would leave a dead gap.
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const loadInitial = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    setInitialScrollDone(false);
    setPage(1);
    setHasMore(false);
    isInitialLoadRef.current = true;
    isPrependingRef.current = false;
    loadingMoreRef.current = false;
    scrollTargetIndexRef.current = null;
    if (initialSettleTimeoutRef.current) clearTimeout(initialSettleTimeoutRef.current);

    try {
      // Fetch the message page and the conversation/peer details in parallel —
      // sequential awaits here just delayed the header (avatar/name) for no reason.
      const [messagesRes, conversationsRes] = await Promise.all([
        api.get(API.messages.messages(id), { params: { page: 1, limit: PAGE_SIZE } }),
        api.get(API.messages.conversations),
      ]);

      const msgs: Message[] =
        messagesRes.data.data || messagesRes.data.messages || messagesRes.data || [];
      setMessages(msgs);
      setHasMore(Boolean(messagesRes.data.pagination?.hasMore));

      const list: Conversation[] =
        conversationsRes.data.data || conversationsRes.data.conversations || conversationsRes.data || [];
      const found = list.find((c) => c.id === id) || null;
      if (found?.user) {
        const rawUser = found.user as any;
        found.user = { ...found.user, id: rawUser.id || rawUser._id };
      }
      setConversation(found);

      // Land the viewport on the first unread message, not just the bottom —
      // messages are oldest→newest, so the last `unreadCount` rows are unread.
      const unread = found?.unreadCount || 0;
      scrollTargetIndexRef.current = unread > 0 ? Math.max(0, msgs.length - unread) : null;
      // If we're about to land somewhere other than the very bottom (an
      // unread message mid-thread), a new incoming message shouldn't yank
      // the viewport down until the user scrolls there themselves.
      isNearBottomRef.current = scrollTargetIndexRef.current === null;

      if (msgs.length === 0) {
        // No content ever gets laid out for an empty thread, so
        // onContentSizeChange will never fire — don't leave the "initial
        // load" flag stuck on, or the next real message (the first one the
        // user sends) will wrongly skip its scroll animation.
        isInitialLoadRef.current = false;
        setInitialScrollDone(true);
      }

      // Only mark-read / clear the unread badge once we know messages actually loaded —
      // a failed fetch must not silently mark unseen messages as seen.
      api.post(API.messages.read(id)).catch(() => {});
      useUnreadStore.getState().clearConversationUnread(id);
    } catch {
      setLoadError("Couldn't load this conversation.");
      setMessages([]);
      isInitialLoadRef.current = false;
      setInitialScrollDone(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadInitial();

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
    const unsubTypingStart = onTypingStart((data) => {
      if (data.conversationId !== id) return;
      setOtherTyping(true);
    });
    const unsubTypingStop = onTypingStop((data) => {
      if (data.conversationId !== id) return;
      setOtherTyping(false);
    });

    return () => {
      leaveConversation(id);
      unsubNewMessage?.();
      unsubRead?.();
      unsubTypingStart?.();
      unsubTypingStop?.();
      // Never leave the peer's "typing…" indicator stuck on if this screen
      // unmounts mid-keystroke (e.g. navigating back before the idle timer fires).
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (initialSettleTimeoutRef.current) clearTimeout(initialSettleTimeoutRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        stopTyping(id);
      }
    };
  }, [id, loadInitial]);

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
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.y < 80) {
      loadMore();
    }
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
  };

  const scrollToBottomFully = useCallback((animated: boolean) => {
    // Fire across a few passes instead of one: the native ScrollView's
    // contentSize for a just-added footer/message doesn't always finish
    // measuring in time for an immediate scrollToEnd, which otherwise lands
    // a few px short (looks like it "didn't scroll" for a small footer like
    // the typing dots). Repeating catches whichever pass sees the real size.
    flatListRef.current?.scrollToEnd({ animated });
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: false }));
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
  }, []);

  // Don't rely solely on onContentSizeChange for this — the footer's
  // appearance can lay out a beat later than the state flip, so drive the
  // scroll directly off otherTyping to guarantee it actually happens. Typing
  // is transient and small, so always follow it to the bottom rather than
  // gating on isNearBottomRef (which the user isn't scrolled far from anyway
  // if they're actively watching this thread).
  useEffect(() => {
    if (otherTyping) {
      scrollToBottomFully(true);
    }
  }, [otherTyping, scrollToBottomFully]);

  const handleStartCall = useCallback(
    (kind: "audio" | "video") => {
      if (!id || !other) return;
      useCallStore.getState().startCall({ conversationId: id, kind, remoteUser: other });
      router.push("/call/outgoing");
    },
    [id, other, router]
  );

  const handleSwipeReply = useCallback((message: Message) => {
    if (message.isDeleted) return;
    setReplyingTo(message);
  }, []);

  const addAttachments = useCallback((next: PendingAttachment[], skipped: string[]) => {
    if (skipped.length > 0) {
      Alert.alert(
        "File too large",
        `${skipped.join(", ")} ${skipped.length > 1 ? "are" : "is"} over 10MB and ${skipped.length > 1 ? "were" : "was"} skipped.`
      );
    }
    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next]);
    }
  }, []);

  const pickImages = useCallback(async () => {
    setShowAttachMenu(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    const next: PendingAttachment[] = [];
    const skipped: string[] = [];
    for (const asset of result.assets) {
      let size = asset.fileSize ?? 0;
      if (!size) {
        try {
          size = new File(asset.uri).size ?? 0;
        } catch {}
      }
      const name = asset.fileName || `photo_${Date.now()}.jpg`;
      if (size > MAX_ATTACHMENT_BYTES) {
        skipped.push(name);
        continue;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: "image",
        uri: asset.uri,
        name,
        mimeType: asset.mimeType || "image/jpeg",
        size,
      });
    }
    addAttachments(next, skipped);
  }, [addAttachments]);

  const pickFiles = useCallback(async () => {
    setShowAttachMenu(false);
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: "*/*" });
    if (result.canceled || !result.assets) return;

    const next: PendingAttachment[] = [];
    const skipped: string[] = [];
    for (const asset of result.assets) {
      let size = asset.size ?? 0;
      if (!size) {
        try {
          size = new File(asset.uri).size ?? 0;
        } catch {}
      }
      if (size > MAX_ATTACHMENT_BYTES) {
        skipped.push(asset.name);
        continue;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: "file",
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || "application/octet-stream",
        size,
      });
    }
    addAttachments(next, skipped);
  }, [addAttachments]);

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microphone access needed", "Allow microphone access to record voice messages.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch {
      Alert.alert("Error", "Couldn't start recording.");
    }
  }, [audioRecorder]);

  const cancelRecording = useCallback(async () => {
    try {
      await audioRecorder.stop();
    } catch {}
  }, [audioRecorder]);

  const stopTypingNow = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current && id) {
      isTypingRef.current = false;
      stopTyping(id);
    }
  }, [id]);

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);
      if (!id) return;

      if (!value.trim()) {
        stopTypingNow();
        return;
      }

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        startTyping(id);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(stopTypingNow, 1500);
    },
    [id, stopTypingNow]
  );

  const send = async () => {
    if ((!text.trim() && attachments.length === 0) || !id || sending || !user) return;
    stopTypingNow();
    const msg = text.trim();
    const attachmentsSnapshot = attachments;
    const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const replySnapshot = replyingTo;
    setText("");
    setReplyingTo(null);
    setAttachments([]);
    setSending(true);
    // You just sent this — always land at the bottom regardless of scroll position.
    forceScrollRef.current = true;

    const optimisticImages = attachmentsSnapshot.filter((a) => a.kind === "image").map((a) => a.uri);
    const optimisticFiles = attachmentsSnapshot
      .filter((a) => a.kind === "file")
      .map((a) => ({ url: a.uri, mimeType: a.mimeType, originalName: a.name, size: a.size }));

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
      images: optimisticImages,
      files: optimisticFiles,
      messageType: optimisticImages.length > 0 ? "image" : optimisticFiles.length > 0 ? "file" : "text",
      reactions: [],
      readBy: [],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      pending: true,
      replyTo: replySnapshot
        ? {
            id: replySnapshot.id,
            text: replySnapshot.text,
            isDeleted: replySnapshot.isDeleted,
            sender: { username: replySnapshot.sender?.username },
          }
        : null,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      let data;
      if (attachmentsSnapshot.length > 0) {
        const formData = new FormData();
        if (msg) formData.append("text", msg);
        if (replySnapshot?.id) formData.append("replyTo", replySnapshot.id);
        attachmentsSnapshot.forEach((a) => {
          const field = a.kind === "image" ? "images" : "files";
          formData.append(field, { uri: a.uri, name: a.name, type: a.mimeType } as any);
        });
        ({ data } = await api.post(API.messages.send(id), formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        }));
      } else {
        ({ data } = await api.post(API.messages.send(id), {
          text: msg,
          replyTo: replySnapshot?.id || undefined,
        }));
      }
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

  const stopAndSendRecording = useCallback(async () => {
    if (!id || !user) return;
    const durationSec = Math.round((recorderState.durationMillis || 0) / 1000);
    let uri: string | null = null;
    try {
      await audioRecorder.stop();
      uri = audioRecorder.uri;
    } catch {}
    if (!uri || durationSec < 1) return;

    const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const replySnapshot = replyingTo;
    setReplyingTo(null);
    setSending(true);
    forceScrollRef.current = true;

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
      text: "",
      images: [],
      audioUrl: uri,
      audioDuration: durationSec,
      messageType: "audio",
      reactions: [],
      readBy: [],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      pending: true,
      replyTo: replySnapshot
        ? {
            id: replySnapshot.id,
            text: replySnapshot.text,
            isDeleted: replySnapshot.isDeleted,
            sender: { username: replySnapshot.sender?.username },
          }
        : null,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const formData = new FormData();
      formData.append("audioDuration", String(durationSec));
      if (replySnapshot?.id) formData.append("replyTo", replySnapshot.id);
      formData.append("audio", { uri, name: `voice_${Date.now()}.m4a`, type: "audio/m4a" } as any);
      const { data } = await api.post(API.messages.send(id), formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      const sent: Message = data.message || data.data || data;
      if (sent.id) {
        recentlySentIds.current.add(sent.id);
        setTimeout(() => recentlySentIds.current.delete(sent.id), 10000);
      }
      setMessages((prev) => prev.map((m) => (m.clientId === clientId ? { ...sent, clientId } : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientId === clientId ? { ...m, pending: false, failed: true } : m))
      );
    } finally {
      setSending(false);
    }
  }, [id, user, replyingTo, audioRecorder, recorderState.durationMillis]);

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
      // "height" on Android works purely off JS keyboard events (Keyboard.addListener
      // under the hood), independent of the native windowSoftInputMode manifest value —
      // so it keeps the header pinned even under Expo Go, which can't apply the
      // android.softwareKeyboardLayoutMode config from app.json without a native rebuild.
      // If this app is ever run from a dev client built with that config baked in
      // (native "resize"), switch this back to `undefined` to avoid double-compensating.
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border + "40",
            paddingTop: 12 + insets.top,
            paddingBottom: Spacing.md + (keyboardVisible ? 8 : 0),
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {other ? (
            <UserLink
              user={other}
              colors={colors}
              avatarSize={32}
              gap={8}
              usernameStyle={styles.headerTitle}
            />
          ) : (
            <>
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
            </>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} hitSlop={8} onPress={() => handleStartCall("audio")}>
            <Icon name="call" set="light" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} hitSlop={8} onPress={() => handleStartCall("video")}>
            <Icon name="video" set="light" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        </View>
      ) : loadError ? (
        <View style={styles.centerFill}>
          <Icon name="danger-circle" set="light" size={40} color={colors.mutedForeground} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>{loadError}</Text>
          <PressableScale onPress={loadInitial} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Try again</Text>
          </PressableScale>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.centerFill}>
          <Icon name="chat" set="light" size={40} color={colors.mutedForeground} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>No messages yet</Text>
          <Text style={[styles.stateSubtitle, { color: colors.mutedForeground }]}>
            Send a message to start the conversation
          </Text>
        </View>
      ) : (
      <FlatList
        ref={flatListRef}
        data={rows}
        keyExtractor={(item, index) => item.message.clientId || item.message.id || `pending-${index}`}
        style={{ opacity: initialScrollDone ? 1 : 0 }}
        contentContainerStyle={styles.messageList}
        onScroll={handleScroll}
        scrollEventThrottle={150}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onScrollToIndexFailed={(info) => {
          const avgItemHeight = info.averageItemLength || 80;
          flatListRef.current?.scrollToOffset({ offset: avgItemHeight * info.index, animated: false });
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0 });
          }, 60);
        }}
        ListHeaderComponent={
          loadingMore ? (
            <View style={styles.loadMoreWrap}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          ) : null
        }
        ListFooterComponent={
          otherTyping ? (
            <Animated.View entering={FadeIn.duration(150)} style={styles.typingRow}>
              <TypingDots color={colors.mutedForeground} />
            </Animated.View>
          ) : null
        }
        onContentSizeChange={() => {
          if (isPrependingRef.current) {
            isPrependingRef.current = false;
            return;
          }
          if (isInitialLoadRef.current) {
            // Content keeps resizing while the first batch's images load in —
            // keep re-snapping unanimated for a short settle window instead of
            // flipping to animated scrolls after the very first layout pass.
            if (initialSettleTimeoutRef.current) clearTimeout(initialSettleTimeoutRef.current);
            const targetIndex = scrollTargetIndexRef.current;
            if (targetIndex !== null && targetIndex > 0) {
              flatListRef.current?.scrollToIndex({ index: targetIndex, animated: false, viewPosition: 0 });
            } else {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
            setInitialScrollDone(true);
            initialSettleTimeoutRef.current = setTimeout(() => {
              isInitialLoadRef.current = false;
            }, 400);
            return;
          }
          // New content landed (a received message, our own sent message, or the
          // typing indicator appearing/disappearing). Only follow it to the bottom
          // if we were already there — never yank the view while reading history.
          if (forceScrollRef.current || isNearBottomRef.current) {
            forceScrollRef.current = false;
            scrollToBottomFully(true);
          }
        }}
        renderItem={({ item, index }) => (
          <MessageRow
            item={item}
            index={index}
            colors={colors}
            other={other}
            isSeen={isSeen}
            lastMineIndex={lastMineIndex}
            onSwipeReply={handleSwipeReply}
          />
        )}
      />
      )}

      {replyingTo && (
        <Animated.View entering={FadeInUp.duration(150)} style={[styles.replyBar, { backgroundColor: colors.card, borderTopColor: colors.border + "40" }]}>
          <View style={[styles.replyBarAccent, { backgroundColor: colors.primary }]} />
          <View style={styles.replyBarBody}>
            <Text style={[styles.replyBarSender, { color: colors.primary }]} numberOfLines={1}>
              Replying to {replyingTo.senderId === user?.id ? "yourself" : other?.username || "message"}
            </Text>
            <Text style={[styles.replyBarText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {replyingTo.isDeleted ? "Message deleted" : replyingTo.text || (replyingTo.images?.length ? "Photo" : "")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose} hitSlop={8}>
            <Icon name="close-square" set="light" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {attachments.length > 0 && (
        <Animated.View
          entering={FadeInUp.duration(150)}
          style={[styles.attachStrip, { backgroundColor: colors.card, borderTopColor: colors.border + "40" }]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachStripContent}>
            {attachments.map((a) => (
              <View key={a.id} style={styles.attachChip}>
                {a.kind === "image" ? (
                  <Image source={{ uri: a.uri }} style={styles.attachThumb} />
                ) : (
                  <View style={[styles.attachFileThumb, { backgroundColor: colors.muted }]}>
                    <Icon name="document" set="light" size={20} color={colors.mutedForeground} />
                    <Text style={[styles.attachFileName, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {a.name}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => removeAttachment(a.id)}
                  style={[styles.attachRemove, { backgroundColor: colors.foreground + "CC" }]}
                  hitSlop={6}
                >
                  <Icon name="close-square" set="bold" size={14} color={colors.background} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <View
        style={[
          styles.inputBar,
          {
            borderTopColor: colors.border + "40",
            backgroundColor: colors.background,
            paddingBottom: Spacing.sm + 4 + (keyboardVisible ? 0 : insets.bottom),
          },
        ]}
      >
        {recorderState.isRecording ? (
          <>
            <TouchableOpacity onPress={cancelRecording} style={styles.attachBtn} hitSlop={6}>
              <Icon name="delete" set="light" size={20} color={colors.destructive} />
            </TouchableOpacity>
            <View style={[styles.recordingIndicator, { backgroundColor: colors.card, borderColor: colors.border + "40" }]}>
              <View style={[styles.recordingDot, { backgroundColor: colors.destructive }]} />
              <Text style={[styles.recordingTime, { color: colors.foreground }]}>
                {formatAudioTime((recorderState.durationMillis || 0) / 1000)}
              </Text>
            </View>
            <PressableScale
              onPress={stopAndSendRecording}
              scaleTo={0.85}
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            >
              <Icon name="tick-square" set="bold" size={18} color={colors.primaryForeground} />
            </PressableScale>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setShowAttachMenu(true)} style={styles.attachBtn} hitSlop={6}>
              <Icon name="camera" set="light" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TextInput
              value={text}
              onChangeText={handleTextChange}
              placeholder="Message..."
              placeholderTextColor={colors.mutedForeground + "80"}
              multiline
              maxLength={2000}
              style={[
                styles.chatInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                },
              ]}
            />
            {text.trim() || attachments.length > 0 ? (
              <PressableScale
                onPress={send}
                disabled={sending}
                scaleTo={0.85}
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
              >
                <Icon name="send" set="bold" size={18} color={colors.primaryForeground} />
              </PressableScale>
            ) : (
              <PressableScale
                onPress={startRecording}
                scaleTo={0.85}
                style={[styles.sendBtn, { backgroundColor: colors.muted }]}
              >
                <Icon name="voice" set="bold" size={18} color={colors.mutedForeground} />
              </PressableScale>
            )}
          </>
        )}
      </View>

      <Modal
        transparent
        visible={showAttachMenu}
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <Pressable style={styles.attachMenuBackdrop} onPress={() => setShowAttachMenu(false)}>
          <View style={[styles.attachMenuCard, { backgroundColor: colors.card, borderColor: colors.border + "40" }]}>
            <TouchableOpacity style={styles.attachMenuItem} onPress={pickImages}>
              <Icon name="image" set="light" size={20} color={colors.foreground} />
              <Text style={[styles.attachMenuText, { color: colors.foreground }]}>Photos</Text>
            </TouchableOpacity>
            <View style={[styles.attachMenuDivider, { backgroundColor: colors.border + "40" }]} />
            <TouchableOpacity style={styles.attachMenuItem} onPress={pickFiles}>
              <Icon name="document" set="light" size={20} color={colors.foreground} />
              <Text style={[styles.attachMenuText, { color: colors.foreground }]}>File</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl, gap: 6 },
  stateTitle: { fontFamily: FontFamily.semibold, fontSize: FontSize.base, lineHeight: 21, marginTop: 8 },
  stateSubtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 20, textAlign: "center" },
  retryBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.pill },
  retryText: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, lineHeight: 20 },
  loadMoreWrap: { paddingVertical: 12, alignItems: "center" },
  dayLabelWrap: { alignItems: "center", marginVertical: 12 },
  dayLabel: {
    ...Typography.caption,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  swipeWrap: { position: "relative" },
  replyIconWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  replyIconWrapMe: { right: -34 },
  replyIconWrapThem: { left: -34 },
  quotedBlock: {
    borderLeftWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
  },
  quotedSender: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, lineHeight: 16 },
  quotedText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 16, marginTop: 1 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 2 },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowThem: { justifyContent: "flex-start" },
  typingRow: { paddingLeft: 30, paddingVertical: 8 },
  typingDotsRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
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
  audioRow: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 200, paddingVertical: 2 },
  audioPlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  audioPauseIcon: { width: 10, height: 10, borderRadius: 2 },
  waveform: { flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 20 },
  waveformBar: { width: 2.5, borderRadius: 2 },
  audioDuration: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 14, minWidth: 32, textAlign: "right" },
  fileList: { gap: 6 },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.md,
    maxWidth: 220,
  },
  fileName: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, lineHeight: 18, flexShrink: 1 },
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
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    gap: 10,
  },
  replyBarAccent: { width: 3, alignSelf: "stretch", borderRadius: 2 },
  replyBarBody: { flex: 1 },
  replyBarSender: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, lineHeight: 16 },
  replyBarText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 16, marginTop: 1 },
  replyBarClose: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  attachStrip: { paddingVertical: 10, borderTopWidth: 0.5 },
  attachStripContent: { paddingHorizontal: Spacing.md, gap: 10 },
  attachChip: { width: 64, height: 64, position: "relative" },
  attachThumb: { width: 64, height: 64, borderRadius: Radius.md },
  attachFileThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    gap: 2,
  },
  attachFileName: { fontSize: 9, lineHeight: 11, textAlign: "center" },
  attachRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  recordingTime: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, lineHeight: 18 },
  attachMenuBackdrop: { flex: 1, backgroundColor: "#00000055", justifyContent: "flex-end" },
  attachMenuCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xxl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  attachMenuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  attachMenuDivider: { height: StyleSheet.hairlineWidth },
  attachMenuText: { fontFamily: FontFamily.medium, fontSize: FontSize.base, lineHeight: 21 },
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
