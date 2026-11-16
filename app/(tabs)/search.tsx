import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl } from "react-native";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing, Gap } from "../../src/theme/spacing";
import { Typography, FontFamily, FontSize } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui";
import { Screen } from "../../src/components/layout";
import { SearchUserSkeleton, PostGridSkeleton } from "../../src/components/skeletons";
import type { Post } from "../../src/types";
import { useSearchUsers, useSuggestedUsers, useRecommendedPosts } from "../../src/hooks/useSearch";
import { useAuthStore } from "../../src/stores/authStore";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - GRID_GAP) / 2;

interface SearchUser {
  id: string;
  username: string;
  avatarUrl?: string;
  displayName?: string;
  bio?: string;
  isVerified?: boolean;
  isFollowing?: boolean;
}

const RECENT_LIMIT = 8;

function toSearchUser(user: { id: string; username: string; avatarUrl?: string; displayName?: string; isVerified?: boolean; isOnline?: boolean; hasStory?: boolean; hasUnviewedStory?: boolean }): SearchUser {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    displayName: user.displayName,
    bio: undefined,
    isVerified: user.isVerified,
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

export default function SearchScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recent, setRecent] = useState<SearchUser[]>([]);
  const [suggestedState, setSuggestedState] = useState<SearchUser[]>([]);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  const [discoverLoadingMore, setDiscoverLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [discoverPostsState, setDiscoverPostsState] = useState<Post[]>([]);

  const { user } = useAuthStore();

  const { data: searchResults, isLoading: searching, error: searchError, refresh: refreshSearch } = useSearchUsers(debouncedQuery);
  const { data: suggestedUsers, isLoading: suggestedLoading, refresh: refreshSuggested } = useSuggestedUsers();
  const { data: discoverPosts, isLoading: discoverLoading, error: discoverError, refresh: refreshDiscover } = useRecommendedPosts(discoverPage, 24, debouncedQuery.trim().length > 0);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (discoverPosts) {
      setDiscoverPostsState(discoverPosts.map(mapPostWriteToPost));
    }
  }, [discoverPosts]);

  useEffect(() => {
    if (suggestedUsers) {
      setSuggestedState(suggestedUsers.map(toSearchUser));
    }
  }, [suggestedUsers]);

  const loadMoreDiscover = useCallback(async () => {
    if (discoverLoadingMore || !discoverHasMore || debouncedQuery.trim().length > 0) return;
    setDiscoverLoadingMore(true);
    const nextPage = discoverPage + 1;
    try {
      const { data: response } = await api.get(`${API.posts.recommended}?page=${nextPage}&limit=24`);
      const { mapRecommendedPostsPayload } = await import("../../src/repositories/profileMappers");
      const nextPosts = mapRecommendedPostsPayload(response);
      if (!nextPosts || nextPosts.length === 0) {
        setDiscoverHasMore(false);
        setDiscoverLoadingMore(false);
        return;
      }
      if (nextPosts && nextPosts.length > 0) {
        setDiscoverPostsState((prev) => [...prev, ...nextPosts.map(mapPostWriteToPost)]);
        setDiscoverHasMore(nextPosts.length === 24);
        setDiscoverPage(nextPage);
      } else {
        setDiscoverHasMore(false);
      }
    } catch (error) {
      console.warn("Load more discover failed", error);
      setDiscoverHasMore(false);
    }
    setDiscoverLoadingMore(false);
  }, [discoverLoadingMore, discoverHasMore, discoverPage, debouncedQuery]);

  const openPost = useCallback((post: Post) => {
    const hasVideo = post.media?.some((m) => m.type === "video");
    if (hasVideo) {
      router.push({
        pathname: "/reels/[postId]",
        params: { postId: post.id, initialPost: JSON.stringify(post) },
      });
    } else {
      router.push({
        pathname: "/post/[postId]",
        params: { postId: post.id, initialPost: JSON.stringify(post) },
      });
    }
  }, []);

  const openUser = useCallback((user: SearchUser) => {
    setRecent((prev) => [user, ...prev.filter((u) => u.id !== user.id)].slice(0, RECENT_LIMIT));
    router.push(`/profile/${user.username}`);
  }, []);

  const removeRecent = useCallback((id: string) => {
    setRecent((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const toggleFollow = useCallback(async (user: SearchUser) => {
    const wasFollowing = !!user.isFollowing;
    const apply = (list: SearchUser[]) =>
      list.map((u) => (u.id === user.id ? { ...u, isFollowing: !wasFollowing } : u));
    setSuggestedState(apply);
    setRecent(apply);
    try {
      await api.post(API.users.follow(user.id));
    } catch {
      const revert = (list: SearchUser[]) =>
        list.map((u) => (u.id === user.id ? { ...u, isFollowing: wasFollowing } : u));
      setSuggestedState(revert);
      setRecent(revert);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshSearch(), refreshSuggested(), refreshDiscover()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshSearch, refreshSuggested, refreshDiscover]);

  const hasQuery = debouncedQuery.trim().length > 0;
  const results = searchResults?.map(toSearchUser) ?? [];
  const suggested = suggestedState;

  const header = (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Search</Text>
      <TouchableOpacity onPress={handleRefresh} hitSlop={8}>
        <Icon name="refresh" set="light" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen header={header} scroll showsVerticalScrollIndicator={false}>
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card + "90" },
            Shadows[isDark ? "dark" : "light"]["soft"],
          ]}
        >
          <Icon name="search" set="light" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search users..."
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="close-square" set="bold" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {hasQuery ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !searching ? (
              <View style={styles.emptyState}>
                <Icon name="search" set="light" size={44} color={colors.mutedForeground + "60"} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {debouncedQuery ? "No results" : "Searching..."}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )
          }
          renderItem={({ item, index }) => (
            <UserRow
              user={item}
              colors={colors}
              index={index}
              onPress={() => openUser(item)}
              onFollow={() => toggleFollow(item)}
            />
          )}
        />
      ) : discoverLoading && discoverPostsState.length === 0 ? (
        <PostGridSkeleton rows={3} />
      ) : (
        <FlatList
          key="discover-grid"
          data={discoverPostsState}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.discoverColumnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.5}
          onEndReached={loadMoreDiscover}
          ListFooterComponent={
            discoverLoadingMore ? (
              <PostGridSkeleton rows={1} horizontalPadding={0} />
            ) : (
              <View />
            )
          }
          ListHeaderComponent={
            <View>
              {recent.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent</Text>
                    <TouchableOpacity onPress={() => setRecent([])} hitSlop={8}>
                      <Text style={[styles.clearText, { color: colors.primary }]}>Clear all</Text>
                    </TouchableOpacity>
                  </View>
                  {recent.map((user, index) => (
                    <Animated.View key={user.id} entering={FadeInDown.duration(250).delay(index * 30)}>
                      <View style={styles.recentRow}>
                        <TouchableOpacity style={styles.userRowMain} onPress={() => openUser(user)}>
                          <Avatar user={user} colors={colors} size={40} />
                          <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
                            {user.username}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeRecent(user.id)} hitSlop={8}>
                          <Icon name="close-square" set="light" size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Suggested for you</Text>
                </View>
                {suggestedLoading ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading...</Text>
                  </View>
                ) : suggested.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="add-user" set="light" size={40} color={colors.mutedForeground + "50"} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      No suggestions right now
                    </Text>
                  </View>
                ) : (
                  suggested.map((user, index) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      colors={colors}
                      index={index}
                      subtitle={user.bio}
                      onPress={() => openUser(user)}
                      onFollow={() => toggleFollow(user)}
                    />
                  ))
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="discovery" set="light" size={40} color={colors.mutedForeground + "50"} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nothing to explore yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const thumb = item.media?.[0];
            return (
              <TouchableOpacity style={styles.discoverGridItem} onPress={() => openPost(item)} activeOpacity={0.85}>
                {thumb ? (
                  <CachedImage source={{ uri: thumb.url }} style={styles.discoverGridImage} contentFit="cover" />
                ) : (
                  <View style={[styles.discoverGridImage, { backgroundColor: colors.muted }]} />
                )}
                {thumb?.type === "video" ? (
                  <View style={styles.discoverVideoBadge}>
                    <Icon name="video" set="bold" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Screen>
  );
}

function Avatar({ user, colors, size }: { user: SearchUser; colors: any; size: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.muted },
      ]}
    >
      {user.avatarUrl ? (
        <CachedImage
          source={{ uri: user.avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Icon name="user" set="light" size={size * 0.45} color={colors.mutedForeground} />
      )}
    </View>
  );
}

function UserRow({
  user,
  colors,
  index,
  subtitle,
  onPress,
  onFollow,
}: {
  user: SearchUser;
  colors: any;
  index: number;
  subtitle?: string;
  onPress: () => void;
  onFollow: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(250).delay(Math.min(index, 8) * 30)}>
      <View style={[styles.resultRow, { borderBottomColor: colors.border + "20" }]}>
        <TouchableOpacity style={styles.userRowMain} onPress={onPress} activeOpacity={0.75}>
          <Avatar user={user} colors={colors} size={44} />
          <View style={styles.resultMeta}>
            <View style={styles.usernameRow}>
              <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
                {user.username}
              </Text>
              {user.isVerified && (
                <Icon name="tick-square" set="bold" size={14} color={colors.verified || colors.primary} />
              )}
            </View>
            {subtitle ? (
              <Text style={[styles.displayName, { color: colors.mutedForeground }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <Button
          title={user.isFollowing ? "Following" : "Follow"}
          onPress={onFollow}
          variant={user.isFollowing ? "outline" : "primary"}
          size="sm"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.h3 },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    height: 44,
    gap: Gap.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
    gap: Gap.md,
  },
  emptyText: {
    ...Typography.body,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  clearText: {
    ...Typography.button,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Gap.md,
  },
  userRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  resultMeta: { flex: 1 },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: Gap.xs },
  username: { fontFamily: FontFamily.medium, fontSize: FontSize.base, lineHeight: 21 },
  displayName: { ...Typography.caption, marginTop: 2 },
  discoverColumnWrapper: { gap: GRID_GAP },
  discoverGridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    marginBottom: GRID_GAP,
    borderRadius: Radius.md,
    overflow: "hidden",
    position: "relative",
  },
  discoverGridImage: { width: "100%", height: "100%" },
  discoverVideoBadge: { position: "absolute", top: 6, right: 6 },
});
