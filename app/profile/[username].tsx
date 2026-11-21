import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { AppIcon } from "../../src/components/ui/AppIcon";
import { icons } from "../../src/constants/icons";
import { TipSheet } from "../../src/components/monetization/TipSheet";
import { ReportSheet } from "../../src/components/ui/ReportSheet";
import { HighlightsRow } from "../../src/components/profile/HighlightsRow";
import { API } from "../../src/api/endpoints";
import type { Post } from "../../src/types";
import { useUserProfile, useUserPosts } from "../../src/hooks/useProfilePosts";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * 2) / 3;

interface ProfileUser {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isVerified?: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isOnline?: boolean;
  isFollowing: boolean;
}

function mapToProfileUser(profile: { id: string; username: string; displayName?: string | null; bio?: string | null; avatar?: string | null; counts: { posts: number; followers: number; following: number } } | null): ProfileUser | null {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatar ?? undefined,
    bio: profile.bio ?? undefined,
    isVerified: false,
    followersCount: profile.counts.followers,
    followingCount: profile.counts.following,
    postsCount: profile.counts.posts,
    isOnline: undefined,
    isFollowing: false,
  };
}

function mapPostWriteToPost(post: { id: string; authorId: string; content: string; media: { url: string; type: "image" | "video" | "audio"; thumbnailUrl?: string; width?: number; height?: number; aspectRatio?: number; duration?: number }[]; createdAt: string; updatedAt: string; deletedAt: string | null }): Post {
  return {
    id: post.id,
    userId: post.authorId,
    author: { id: post.authorId, username: "", isVerified: false },
    caption: post.content,
    media: post.media.map(m => ({
      id: "",
      url: m.url,
      type: m.type,
      width: m.width,
      height: m.height,
      aspectRatio: m.aspectRatio,
      thumbnailUrl: m.thumbnailUrl,
      duration: m.duration,
    })),
    tags: [],
    location: undefined,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isLiked: false,
    isSaved: false,
    createdAt: post.createdAt,
  };
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const { profile, isLoading: profileLoading, error: profileError, refresh: refreshProfile } = useUserProfile(username);
  const { posts: localPosts, isLoading: postsLoading, error: postsError, refresh: refreshPosts, cursor, hasMore, loadingMore, loadMore } = useUserPosts(username);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const isSelf = currentUser?.username === username;
  const mappedProfile = mapToProfileUser(profile);

  useEffect(() => {
    if (localPosts.length > 0) {
      setPosts(localPosts.map(mapPostWriteToPost));
    }
  }, [localPosts]);

  const load = useCallback(async () => {
    if (profileLoading || postsLoading) return;
    try {
      await Promise.all([refreshProfile(), refreshPosts()]);
    } catch (error) {
      console.warn("User profile refresh failed", error);
    }
  }, [profileLoading, postsLoading, refreshProfile, refreshPosts]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    await loadMore();
  }, [loadingMore, hasMore, loadMore]);

  const toggleFollow = useCallback(async () => {
    if (!mappedProfile || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = mappedProfile.isFollowing;
    setFollowLoading(false);
    try {
      await router.push({ pathname: "/(modals)/settings" });
    } catch {}
  }, [mappedProfile, followLoading]);

  const submitReport = useCallback(
    async (reason: string) => {
      if (!mappedProfile) return;
      try {
        // API call would go here
      } catch {}
    },
    [mappedProfile],
  );

  const openPost = useCallback((post: Post) => {
    const hasVideo = post.media?.some((m) => m.type === "video");
    router.push({
      pathname: hasVideo ? "/reels/[postId]" : "/post/[postId]",
      params: { postId: post.id, initialPost: JSON.stringify(post) },
    });
  }, []);

  const archivePost = useCallback(async (post: Post) => {
    try {
      await fetch(API.posts.byId(post.id), { method: "PUT", body: JSON.stringify({ archived: true }) });
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch {
      Alert.alert("Couldn't archive post", "Please try again.");
    }
  }, []);

  const onGridItemLongPress = useCallback(
    (post: Post) => {
      if (!isSelf) return;
      Alert.alert("Archive post?", "It will be hidden from your profile and the feed until you unarchive it.", [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", style: "destructive", onPress: () => archivePost(post) },
      ]);
    },
    [isSelf, archivePost]
  );

  if (profileLoading && !mappedProfile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!mappedProfile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 12 }]}>
        <Text style={{ color: colors.foreground }}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {mappedProfile.username}
        </Text>
        {!isSelf ? (
          <TouchableOpacity onPress={() => setReportVisible(true)} style={styles.backBtn} hitSlop={8}>
            <AppIcon icon={icons.ellipsisHorizontal} size={20} color={colors.foreground}  />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <ReportSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        colors={colors}
        onSubmit={submitReport}
      />

      <View style={styles.topSection}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            {mappedProfile.avatarUrl ? (
              <CachedImage source={{ uri: mappedProfile.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Icon name="user" set="light" size={36} color={colors.mutedForeground} />
            )}
          </View>
          {mappedProfile.isOnline ? (
            <View style={[styles.onlineDot, { backgroundColor: colors.online, borderColor: colors.background }]} />
          ) : null}
        </View>

        <View style={styles.statsRow}>
          {[
            { label: "Posts", value: mappedProfile.postsCount },
            { label: "Followers", value: mappedProfile.followersCount, mode: "followers" as const },
            { label: "Following", value: mappedProfile.followingCount, mode: "following" as const },
          ].map((stat) =>
            stat.mode ? (
              <TouchableOpacity
                key={stat.label}
                style={styles.stat}
                onPress={() =>
                  router.push({
                    pathname: "/profile/follow-list",
                    params: { userId: mappedProfile.id, mode: stat.mode, title: `${stat.label}` },
                  })
                }
              >
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </TouchableOpacity>
            ) : (
              <View key={stat.label} style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            )
          )}
        </View>
      </View>

      <View style={styles.nameSection}>
        <View style={styles.nameRow}>
          <Text style={[styles.username, { color: colors.foreground }]}>{mappedProfile.username}</Text>
          {mappedProfile.isVerified ? <Icon name="shield" set="bold" size={16} color={colors.primary} /> : null}
        </View>
        {mappedProfile.bio ? <Text style={[styles.bio, { color: colors.mutedForeground }]}>{mappedProfile.bio}</Text> : null}
      </View>

      {!isSelf ? (
        <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={toggleFollow}
          disabled={followLoading}
          style={[
            styles.followBtn,
            styles.followBtnFlex,
            mappedProfile.isFollowing
              ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
              : { backgroundColor: colors.primary },
          ]}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={mappedProfile.isFollowing ? colors.foreground : colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.followBtnText,
                { color: mappedProfile.isFollowing ? colors.foreground : colors.primaryForeground },
              ]}
            >
              {mappedProfile.isFollowing ? "Following" : "Follow"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTipVisible(true)}
          style={[styles.tipBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityLabel={`Send Stars to ${mappedProfile.username}`}
        >
          <AppIcon icon={icons.starOutline} size={16} color={colors.foreground}  />
          <Text style={[styles.followBtnText, { color: colors.foreground }]}>Stars</Text>
        </TouchableOpacity>
        </View>
      ) : null}

      <TipSheet
        visible={tipVisible}
        onClose={() => setTipVisible(false)}
        recipientId={mappedProfile.id}
        recipientUsername={mappedProfile.username}
      />

      <HighlightsRow userId={mappedProfile.id} colors={colors} />

      <View style={[styles.divider, { backgroundColor: colors.border + "30" }]} />

      <View style={styles.grid}>
        {posts
          .filter((post) => !post.isDeleted)
          .map((post) => {
            const thumb = post.media?.[0];
            return (
              <TouchableOpacity
                key={post.id}
                style={styles.gridItem}
                onPress={() => openPost(post)}
                onLongPress={() => onGridItemLongPress(post)}
                activeOpacity={0.85}
              >
                {thumb ? (
                  <CachedImage source={{ uri: thumb.url }} style={styles.gridImage} contentFit="cover" />
                ) : (
                  <View style={[styles.gridImage, { backgroundColor: colors.muted }]} />
                )}
                {thumb?.type === "video" ? (
                  <View style={styles.gridVideoBadge}>
                    <Icon name="video" set="bold" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
      </View>

      {hasMore && !loadingMore && (
        <TouchableOpacity 
          style={{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: Radius.md, backgroundColor: colors.primary, alignSelf: "center", marginTop: Spacing.md }} 
          onPress={handleLoadMore} 
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.primaryForeground, ...Typography.button }}>Load more</Text>
        </TouchableOpacity>
      )}

      {posts.filter((post) => !post.isDeleted).length === 0 && !hasMore ? (
        <View style={styles.emptyGrid}>
          <Icon name="image" set="light" size={40} color={colors.mutedForeground + "60"} />
          <Text style={[styles.emptyGridText, { color: colors.mutedForeground }]}>No posts yet</Text>
        </View>
      ) : null}
    </ScrollView>
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
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4, flex: 1, textAlign: "center" },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: 20,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statValue: { ...Typography.h4 },
  statLabel: { ...Typography.caption, marginTop: 2 },
  nameSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  username: { fontFamily: FontFamily.bold, fontSize: 17 },
  bio: { ...Typography.bodySmall, marginTop: 4 },
  followBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  followBtnText: { fontFamily: FontFamily.semibold, fontSize: 14 },
  actionRow: { flexDirection: "row", alignItems: "center" },
  followBtnFlex: { flex: 1, marginRight: 0 },
  tipBtn: {
    marginRight: Spacing.lg,
    marginLeft: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  divider: { height: StyleSheet.hairlineWidth, marginTop: Spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  gridItem: { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, position: "relative" },
  gridImage: { width: "100%", height: "100%" },
  gridVideoBadge: { position: "absolute", top: 6, right: 6 },
  emptyGrid: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyGridText: { ...Typography.bodySmall },
});
