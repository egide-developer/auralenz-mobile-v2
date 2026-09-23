import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { Ionicons } from "@expo/vector-icons";
import { ReportSheet } from "../../src/components/ui/ReportSheet";
import { HighlightsRow } from "../../src/components/profile/HighlightsRow";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Post } from "../../src/types";

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

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const isSelf = currentUser?.username === username;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(API.users.byUsername(username));
      setProfile(data.user);
      setPosts(data.posts || []);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFollow = useCallback(async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = profile.isFollowing;
    setProfile((p) => (p ? { ...p, isFollowing: !wasFollowing, followersCount: p.followersCount + (wasFollowing ? -1 : 1) } : p));
    try {
      await api.post(API.users.follow(profile.id));
    } catch {
      setProfile((p) => (p ? { ...p, isFollowing: wasFollowing, followersCount: p.followersCount + (wasFollowing ? 1 : -1) } : p));
    } finally {
      setFollowLoading(false);
    }
  }, [profile, followLoading]);

  const submitReport = useCallback(
    async (reason: string) => {
      if (!profile) return;
      try {
        await api.post(API.reports.create, { targetType: "user", targetId: profile.id, reason });
      } catch {}
    },
    [profile],
  );

  const openPost = useCallback((post: Post) => {
    const hasVideo = post.media?.some((m) => m.type === "video");
    router.push({
      pathname: hasVideo ? "/reels/[postId]" : "/post/[postId]",
      params: { postId: post.id, initialPost: JSON.stringify(post) },
    });
  }, []);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
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
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {profile.username}
        </Text>
        {!isSelf ? (
          <TouchableOpacity onPress={() => setReportVisible(true)} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.foreground} />
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
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Icon name="user" set="light" size={36} color={colors.mutedForeground} />
            )}
          </View>
          {profile.isOnline ? (
            <View style={[styles.onlineDot, { backgroundColor: colors.online, borderColor: colors.background }]} />
          ) : null}
        </View>

        <View style={styles.statsRow}>
          {[
            { label: "Posts", value: profile.postsCount },
            { label: "Followers", value: profile.followersCount, mode: "followers" as const },
            { label: "Following", value: profile.followingCount, mode: "following" as const },
          ].map((stat) =>
            stat.mode ? (
              <TouchableOpacity
                key={stat.label}
                style={styles.stat}
                onPress={() =>
                  router.push({
                    pathname: "/profile/follow-list",
                    params: { userId: profile.id, mode: stat.mode, title: `${stat.label}` },
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
          <Text style={[styles.username, { color: colors.foreground }]}>{profile.username}</Text>
          {profile.isVerified ? <Icon name="shield" set="bold" size={16} color={colors.primary} /> : null}
        </View>
        {profile.bio ? <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text> : null}
      </View>

      {!isSelf ? (
        <TouchableOpacity
          onPress={toggleFollow}
          disabled={followLoading}
          style={[
            styles.followBtn,
            profile.isFollowing
              ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
              : { backgroundColor: colors.primary },
          ]}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={profile.isFollowing ? colors.foreground : colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.followBtnText,
                { color: profile.isFollowing ? colors.foreground : colors.primaryForeground },
              ]}
            >
              {profile.isFollowing ? "Following" : "Follow"}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}

      <HighlightsRow userId={profile.id} colors={colors} />

      <View style={[styles.divider, { backgroundColor: colors.border + "30" }]} />

      <View style={styles.grid}>
        {posts.map((post) => {
          const thumb = post.media?.[0];
          return (
            <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => openPost(post)} activeOpacity={0.85}>
              {thumb ? (
                <Image source={{ uri: thumb.url }} style={styles.gridImage} resizeMode="cover" />
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

      {posts.length === 0 ? (
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
    borderBottomWidth: 0.5,
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
  divider: { height: StyleSheet.hairlineWidth, marginTop: Spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  gridItem: { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, position: "relative" },
  gridImage: { width: "100%", height: "100%" },
  gridVideoBadge: { position: "absolute", top: 6, right: 6 },
  emptyGrid: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyGridText: { ...Typography.bodySmall },
});
