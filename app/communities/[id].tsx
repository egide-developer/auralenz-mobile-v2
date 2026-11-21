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
import { AppIcon } from "../../src/components/ui/AppIcon";
import { icons } from "../../src/constants/icons";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { showToast } from "../../src/stores/toastStore";
import type { Community, CommunityMessage } from "../../src/types";

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [community, setCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isMemberspace = community?.isJoined;
  const isAdmin = community?.myRole === "owner" || community?.myRole === "admin";

  const fetchCommunity = useCallback(async () => {
    try {
      const { data } = await api.get(API.communities.feed(id));
      setCommunity(data.community);
      setMessages(data.messages || []);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        Alert.alert("Not found", "This community no longer exists");
        router.back();
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  const postToFeed = useCallback(async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const { data } = await api.post(API.communities.messages(id), { text });
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Could not post", "error");
    } finally {
      setPosting(false);
    }
  }, [draft, posting, id]);

  const joinCommunity = useCallback(async () => {
    try {
      const { data } = await api.post(API.communities.join(id));
      setCommunity(data.community);
      fetchCommunity();
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Could not join", "error");
    }
  }, [id, fetchCommunity]);

  const confirmLeave = useCallback(() => {
    Alert.alert("Leave community", `Stop following ${community?.name || "this community"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setLeaving(true);
          try {
            await api.delete(API.communities.leave(id));
            showToast("Left community", "info");
            router.back();
          } catch (e: any) {
            showToast(e?.response?.data?.message || "Could not leave", "error");
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  }, [community?.name, id]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      "Delete community",
      `Delete ${community?.name || "this community"} and all its posts for everyone? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(API.communities.remove(id));
              showToast("Community deleted", "info");
              router.back();
            } catch (e: any) {
              showToast(e?.response?.data?.message || "Could not delete", "error");
            }
          },
        },
      ]
    );
  }, [community?.name, id]);

  const deletePost = useCallback(
    (messageId: string) => {
      Alert.alert("Delete post", "Remove this post from the community?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(API.communities.deleteMessage(id, messageId));
              setMessages((prev) => prev.filter((m) => m.id !== messageId));
            } catch (e: any) {
              showToast(e?.response?.data?.message || "Could not delete", "error");
            }
          },
        },
      ]);
    },
    [id]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {community?.name || "Community"}
        </Text>
        <View style={styles.headerActions}>
          {community?.isJoined && community?.myRole !== "owner" && (
            <TouchableOpacity onPress={confirmLeave} hitSlop={10} style={styles.headerBtn} accessibilityLabel="Leave community">
              <AppIcon icon={icons.logoutOutline} size={21} color={colors.mutedForeground}  />
            </TouchableOpacity>
          )}
          {community?.myRole === "owner" && (
            <TouchableOpacity onPress={confirmDelete} hitSlop={10} style={styles.headerBtn} accessibilityLabel="Delete community">
              <AppIcon icon={icons.trash} size={21} color={colors.destructive}  />
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
                  community?.avatarUrl ? undefined : { backgroundColor: colors.primary + "18" },
                ]}
              >
                {community?.avatarUrl ? (
                  <CachedImage source={{ uri: community.avatarUrl }} style={styles.bannerAvatarImg} />
                ) : (
                  <AppIcon icon={icons.people} size={30} color={colors.primary}  />
                )}
              </View>
              <View style={styles.bannerMeta}>
                <View style={styles.bannerTitleRow}>
                  <Text style={[styles.bannerName, { color: colors.foreground }]}>{community?.name}</Text>
                </View>
                {community?.description ? (
                  <Text style={[styles.bannerDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
                    {community.description}
                  </Text>
                ) : null}
                <View style={styles.bannerStats}>
                  <Text style={[styles.bannerStat, { color: colors.mutedForeground }]}>
                    {community?.memberCount} member{community?.memberCount === 1 ? "" : "s"}
                  </Text>
                  {community?.category ? (
                    <Text style={[styles.bannerStat, { color: colors.mutedForeground }]}> · {community.category}</Text>
                  ) : null}
                  <Text style={[styles.bannerStat, { color: colors.mutedForeground }]}> · {community?.owner?.username}</Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {isMemberspace ? "No posts yet. Start the conversation." : "Join to see the conversation and post."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const canDelete = item.author.id === currentUser?.id || isAdmin;
            return (
              <View style={[styles.post, { backgroundColor: colors.card }]}>
                <View style={styles.postHeader}>
                  <UserLink user={item.author} colors={colors} avatarSize={34} showUsername={true} />
                  {canDelete && (
                    <TouchableOpacity onPress={() => deletePost(item.id)} hitSlop={8}>
                      <AppIcon icon={icons.trash} size={16} color={colors.mutedForeground}  />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.postText, { color: colors.foreground }]}>{item.text}</Text>
                {item.images.length > 0 && (
                  <View style={styles.postImages}>
                    {item.images.map((uri) => (
                      <CachedImage key={uri} source={{ uri }} style={styles.postImage} />
                    ))}
                  </View>
                )}
                <Text style={[styles.postTime, { color: colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </Text>
              </View>
            );
          }}
        />
      )}

      {isMemberspace || !community ? null : (
        <View style={[styles.joinBar, { borderTopColor: colors.border + "40", backgroundColor: colors.background }]}>
          <PressableScale onPress={joinCommunity} style={[styles.joinBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.joinBtnText, { color: colors.primaryForeground }]}>Join community</Text>
          </PressableScale>
        </View>
      )}

      {isMemberspace && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.inputBar, { borderTopColor: colors.border + "40", backgroundColor: colors.background }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Post to ${community?.name || "community"}...`}
              placeholderTextColor={colors.mutedForeground + "80"}
              multiline
              style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
              maxLength={2000}
            />
            <PressableScale onPress={postToFeed} disabled={!draft.trim() || posting} scaleTo={0.92} style={styles.sendBtn}>
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
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4, flex: 1, textAlign: "center", paddingHorizontal: 8 },
  headerActions: { flexDirection: "row" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: Spacing.lg, paddingBottom: 120 },
  banner: {
    flexDirection: "row",
    gap: 14,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.08)",
    marginBottom: Spacing.md,
  },
  bannerAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  bannerAvatarImg: { width: 56, height: 56, borderRadius: 28 },
  bannerMeta: { flex: 1 },
  bannerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bannerName: { ...Typography.h4, marginBottom: 2, flexShrink: 1 },
  bannerDesc: { ...Typography.bodySmall, marginBottom: 6 },
  bannerStats: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  bannerStat: { ...Typography.caption },
  empty: { paddingVertical: 48, alignItems: "center" },
  emptyText: { ...Typography.bodySmall },
  post: {
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  postHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  postText: { ...Typography.body, lineHeight: 20 },
  postImages: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  postImage: { width: 96, height: 96, borderRadius: 10 },
  postTime: { ...Typography.caption },
  joinBar: {
    flexDirection: "row",
    justifyContent: "center",
    padding: Spacing.md,
    borderTopWidth: 0.5,
  },
  joinBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: Radius.pill },
  joinBtnText: { ...Typography.body, fontFamily: FontFamily.semibold },
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
  sendBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});