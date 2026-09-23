import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "../../src/components/ui/Icon";
import { UserLink } from "../../src/components/ui/UserLink";
import { PressableScale } from "../../src/components/ui/PressableScale";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { onNewMessage } from "../../src/services/socket";
import type { Conversation, UserPreview } from "../../src/types";

const SCREEN_HEIGHT = Dimensions.get("window").height;

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [composeOpen, setComposeOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState<UserPreview[]>([]);
  const [suggested, setSuggested] = useState<UserPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);

  const openCompose = useCallback(() => {
    setComposeOpen(true);
    translateY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
    overlayOpacity.value = withTiming(1, { duration: 260 });
  }, [overlayOpacity, translateY]);

  const closeCompose = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setComposeOpen)(false);
    });
    overlayOpacity.value = withTiming(0, { duration: 240 });
    setDiscoverQuery("");
    setDiscoverResults([]);
  }, [overlayOpacity, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get(API.messages.conversations);
      setConversations(data.data || data.conversations || data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tabs stay mounted, so a plain mount-only effect never refires after you
  // read a thread and come back — the list would keep showing it as unread.
  // Refetch every time this screen regains focus instead.
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    const unsubscribe = onNewMessage(({ message, conversationId }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) return prev;
        const isMine = message.senderId === currentUser?.id;
        const updated: Conversation = {
          ...prev[idx],
          lastMessage: {
            text: message.isDeleted ? "Message deleted" : message.text,
            messageType: message.messageType,
            senderId: message.senderId,
            senderName: prev[idx].lastMessage?.senderName || "",
            messageId: message.id,
            isDeleted: message.isDeleted,
            timestamp: message.createdAt,
          },
          unreadCount: isMine ? prev[idx].unreadCount : prev[idx].unreadCount + 1,
        };
        const next = prev.filter((c) => c.id !== conversationId);
        return [updated, ...next];
      });
    });
    return unsubscribe;
  }, [currentUser?.id]);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => (c.user?.username || "").toLowerCase().includes(q));
  }, [conversations, query]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  useEffect(() => {
    if (!composeOpen) return;
    setDiscoverQuery("");
    setDiscoverResults([]);
    let active = true;
    api
      .get(`${API.users.suggested}?limit=12`)
      .then(({ data }) => {
        if (active) setSuggested(data.data || data.users || data || []);
      })
      .catch(() => {
        if (active) setSuggested([]);
      });
    return () => {
      active = false;
    };
  }, [composeOpen]);

  useEffect(() => {
    if (!composeOpen || !discoverQuery.trim()) {
      setDiscoverResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .get(`${API.users.search}?q=${encodeURIComponent(discoverQuery.trim())}`)
        .then(({ data }) => {
          if (active) setDiscoverResults(data.data || data.users || data || []);
        })
        .catch(() => {
          if (active) setDiscoverResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [discoverQuery, composeOpen]);

  const openConversation = useCallback(
    (conversationId: string) => {
      closeCompose();
      router.push({ pathname: "/messages/[id]", params: { id: conversationId } });
    },
    [closeCompose]
  );

  const startConversation = useCallback(
    async (participantId: string) => {
      const existing = conversations.find((c) => c.user?.id === participantId);
      if (existing) {
        openConversation(existing.id);
        return;
      }
      setCreatingId(participantId);
      try {
        const { data } = await api.post(API.messages.conversations, { participantId });
        const conversationId =
          (data?.conversation as any)?._id || (data?.conversation as any)?.id;
        if (conversationId) {
          openConversation(conversationId);
        } else {
          Alert.alert("Error", "Failed to create conversation");
        }
      } catch (e: any) {
        Alert.alert("Error", e?.response?.data?.message || "Failed to start chat");
      } finally {
        setCreatingId(null);
      }
    },
    [conversations, openConversation]
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              {totalUnread} unread
            </Text>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PressableScale
            style={[styles.composeBtn, { backgroundColor: colors.card + "90" }]}
            onPress={() => router.push("/(modals)/groups")}
          >
            <Ionicons name="people-outline" size={19} color={colors.mutedForeground} />
          </PressableScale>
          <PressableScale
            style={[styles.composeBtn, { backgroundColor: colors.card + "90" }]}
            onPress={openCompose}
          >
            <Icon name="edit-square" set="light" size={19} color={colors.mutedForeground} />
          </PressableScale>
        </View>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Icon name="search" set="light" size={17} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search messages"
          placeholderTextColor={colors.mutedForeground + "90"}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <Icon name="close-square" set="bold" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
              <Icon name="chat" set="light" size={48} color={colors.mutedForeground + "60"} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {query ? "No matches found" : "No conversations yet"}
              </Text>
            </Animated.View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const displayName = item.user?.username || "Chat";
          const unread = item.unreadCount > 0;
          const isMine = item.lastMessage?.senderId === currentUser?.id;

          return (
            <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
              <PressableScale
                scaleTo={0.97}
                style={[styles.conversationRow, unread && { backgroundColor: colors.primary + "08", borderRadius: 14, marginHorizontal: -6, paddingHorizontal: 6 }]}
                onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id } })}
              >
                {item.user ? (
                  <View style={{ marginRight: 12 }}>
                    <UserLink user={item.user} colors={colors} avatarSize={54} showUsername={false} />
                  </View>
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                    <Icon name="user" set="light" size={22} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.conversationMeta}>
                  <View style={styles.conversationHeader}>
                    {item.user ? (
                      <UserLink
                        user={item.user}
                        colors={colors}
                        showAvatar={false}
                        usernameStyle={[styles.name, unread && styles.nameUnread]}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.name,
                          { color: colors.foreground },
                          unread && styles.nameUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>
                    )}
                    {item.lastMessage && (
                      <Text
                        style={[
                          styles.time,
                          { color: unread ? colors.primary : colors.mutedForeground },
                        ]}
                      >
                        {timeAgo(item.lastMessage.timestamp)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.previewRow}>
                    <Text
                      style={[
                        styles.preview,
                        { color: unread ? colors.foreground : colors.mutedForeground },
                        unread && styles.previewUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage
                        ? `${isMine ? "You: " : ""}${
                            item.lastMessage.isDeleted ? "Message deleted" : item.lastMessage.text
                          }`
                        : "Start a conversation"}
                    </Text>
                    {unread && (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.unreadText, { color: colors.primaryForeground }]}>
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
      />

      <Modal
        visible={composeOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeCompose}
      >
        <View style={styles.sheetBackdrop}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.sheetOverlay, overlayStyle]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeCompose}
            />
          </Animated.View>
          <Animated.View
            style={[styles.sheet, sheetStyle, { backgroundColor: colors.card }]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.mutedForeground + "40" }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New message</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                Search people or start a chat
              </Text>
            </View>

            <View style={[styles.discoverBar, { backgroundColor: colors.background }]}>
              <Icon name="search" set="light" size={17} color={colors.mutedForeground} />
              <TextInput
                value={discoverQuery}
                onChangeText={setDiscoverQuery}
                placeholder="Search people..."
                placeholderTextColor={colors.mutedForeground + "80"}
                style={[styles.discoverInput, { color: colors.foreground }]}
                autoFocus
              />
            </View>

            <FlatList
              data={discoverQuery.trim() ? discoverResults : suggested}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.discoverList}
              ListEmptyComponent={
                searching ? (
                  <View style={styles.discoverEmpty}>
                    <ActivityIndicator size="small" color={colors.mutedForeground} />
                  </View>
                ) : (
                  <View style={styles.discoverEmpty}>
                    <Text style={[styles.discoverEmptyText, { color: colors.mutedForeground }]}>
                      {discoverQuery.trim() ? "No people found" : "No suggestions"}
                    </Text>
                  </View>
                )
              }
              renderItem={({ item }) => {
                const id = item.id || (item as any)._id;
                const isCreating = creatingId === id;
                return (
                  <TouchableOpacity
                    onPress={() => startConversation(id)}
                    disabled={!!creatingId}
                    activeOpacity={0.7}
                    style={styles.personRow}
                  >
                    <View style={[styles.personAvatar, { backgroundColor: colors.muted }]}>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.personAvatarImg} />
                      ) : (
                        <Icon name="user" set="light" size={20} color={colors.mutedForeground} />
                      )}
                    </View>
                    <Text
                      style={[styles.personName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.username}
                    </Text>
                    {isCreating ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Icon name="arrow-right" set="light" size={16} color={colors.mutedForeground} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { ...Typography.h3 },
  headerSubtitle: { ...Typography.caption, marginTop: 2 },
  composeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodySmall,
    paddingVertical: 0,
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { ...Typography.body },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: { width: 54, height: 54, borderRadius: 27 },
  conversationMeta: { flex: 1 },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontFamily: FontFamily.semibold, fontSize: Typography.body.fontSize, lineHeight: Typography.body.lineHeight, flex: 1, marginRight: 8 },
  nameUnread: { fontFamily: FontFamily.bold },
  time: { ...Typography.caption },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  preview: { ...Typography.bodySmall, flex: 1, marginRight: 8 },
  previewUnread: { fontFamily: FontFamily.semibold },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  unreadText: { fontFamily: FontFamily.bold, fontSize: 12, lineHeight: 16 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#00000000",
  },
  sheetOverlay: {
    backgroundColor: "#00000055",
  },
  sheet: {
    borderTopLeftRadius: Radius["2xl"],
    borderTopRightRadius: Radius["2xl"],
    paddingTop: 8,
    maxHeight: "80%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  sheetHeader: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  sheetTitle: { ...Typography.h4 },
  sheetSubtitle: { ...Typography.caption, marginTop: 2 },
  discoverBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: Radius.pill,
    gap: 8,
  },
  discoverInput: {
    flex: 1,
    ...Typography.bodySmall,
    paddingVertical: 0,
  },
  discoverList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  discoverEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  discoverEmptyText: { ...Typography.bodySmall },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  personAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  personAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  personName: { ...Typography.body, flex: 1 },
});
