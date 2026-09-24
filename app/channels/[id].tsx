import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { UserLink } from "../../src/components/ui/UserLink";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { showToast } from "../../src/stores/toastStore";
import type { Channel, ChannelMessage } from "../../src/types";

export default function ChannelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const canPost = channel?.myRole === "owner" || channel?.myRole === "admin";

  const fetchChannel = useCallback(async () => {
    try {
      const { data } = await api.get(API.channels.messages(id));
      setChannel(data.channel);
      setMessages(data.messages || []);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        Alert.alert("Join to read", e?.response?.data?.message || "Join this channel to read it");
        router.back();
        return;
      }
      if (e?.response?.status === 404) {
        Alert.alert("Not found", "This channel no longer exists");
        router.back();
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChannel();
  }, [fetchChannel]);

  const postBroadcast = useCallback(async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const { data } = await api.post(API.channels.messages(id), { text });
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Could not post", "error");
    } finally {
      setPosting(false);
    }
  }, [draft, posting, id]);

  const confirmLeave = useCallback(() => {
    Alert.alert("Leave channel", `Stop following ${channel?.name || "this channel"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setLeaving(true);
          try {
            await api.delete(API.channels.leave(id));
            showToast("Left channel", "info");
            router.back();
          } catch (e: any) {
            showToast(e?.response?.data?.message || "Could not leave", "error");
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  }, [channel?.name, id]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      "Delete channel",
      `Delete ${channel?.name || "this channel"} and its broadcasts for everyone? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(API.channels.remove(id));
              showToast("Channel deleted", "info");
              router.back();
            } catch (e: any) {
              showToast(e?.response?.data?.message || "Could not delete", "error");
            }
          },
        },
      ]
    );
  }, [channel?.name, id]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {channel?.name || "Channel"}
        </Text>
        <View style={styles.headerActions}>
          {channel?.isJoined && (
            <TouchableOpacity onPress={confirmLeave} hitSlop={10} style={styles.headerBtn} accessibilityLabel="Leave channel">
              <Ionicons name="log-out-outline" size={21} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {channel?.myRole === "owner" && (
            <TouchableOpacity onPress={confirmDelete} hitSlop={10} style={styles.headerBtn} accessibilityLabel="Delete channel">
              <Ionicons name="trash-outline" size={21} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.banner}>
              <View
                style={[
                  styles.bannerAvatar,
                  channel?.avatarUrl ? undefined : { backgroundColor: colors.primary + "18" },
                ]}
              >
                {channel?.avatarUrl ? (
                  <CachedImage source={{ uri: channel.avatarUrl }} style={styles.bannerAvatarImg} />
                ) : (
                  <Ionicons name="megaphone" size={30} color={colors.primary} />
                )}
              </View>
              <View style={styles.bannerMeta}>
                <Text style={[styles.bannerName, { color: colors.foreground }]}>{channel?.name}</Text>
                {channel?.description ? (
                  <Text style={[styles.bannerDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {channel.description}
                  </Text>
                ) : null}
                <View style={styles.bannerStats}>
                  <Text style={[styles.bannerStat, { color: colors.mutedForeground }]}>
                    {channel?.memberCount} member{channel?.memberCount === 1 ? "" : "s"}
                  </Text>
                  <Text style={[styles.bannerStat, { color: colors.mutedForeground }]}>
                    · {messages.length} broadcast{messages.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {canPost ? "No broadcasts yet. Post the first one." : "No broadcasts yet."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.broadcast, { backgroundColor: colors.card }]}>
              <View style={styles.broadcastHeader}>
                <UserLink user={item.sender} colors={colors} avatarSize={34} showUsername={true} />
                <Text style={[styles.broadcastTime, { color: colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </Text>
              </View>
              <Text style={[styles.broadcastText, { color: colors.foreground }]}>{item.text}</Text>
            </View>
          )}
        />
      )}

      {canPost && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.inputBar, { borderTopColor: colors.border + "40", backgroundColor: colors.background }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Broadcast to ${channel?.memberCount || 0} subscriber${channel?.memberCount === 1 ? "" : "s"}...`}
              placeholderTextColor={colors.mutedForeground + "80"}
              multiline
              style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
            />
            <PressableScale onPress={postBroadcast} disabled={!draft.trim() || posting} scaleTo={0.92} style={styles.sendBtn}>
              {posting ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Icon name="arrow-up-circle" set="bold" size={30} color={draft.trim() ? colors.primaryForeground : colors.primaryForeground + "88"} />
              )}
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4, flex: 1, textAlign: "center", paddingHorizontal: 8 },
  headerActions: { flexDirection: "row" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: Spacing.lg, paddingBottom: 120 },
  banner: { flexDirection: "row", gap: 14, paddingBottom: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.08)", marginBottom: Spacing.md },
  bannerAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  bannerAvatarImg: { width: 56, height: 56, borderRadius: 28 },
  bannerMeta: { flex: 1 },
  bannerName: { ...Typography.h4, marginBottom: 2 },
  bannerDesc: { ...Typography.bodySmall, marginBottom: 6 },
  bannerStats: { flexDirection: "row", alignItems: "center" },
  bannerStat: { ...Typography.caption },
  empty: { paddingVertical: 48, alignItems: "center" },
  emptyText: { ...Typography.bodySmall },
  broadcast: {
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  broadcastHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  broadcastTime: { ...Typography.caption },
  broadcastText: { ...Typography.body, lineHeight: 20 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Typography.bodySmall,
  },
  sendBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});