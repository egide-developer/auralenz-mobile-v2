import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily, FontSize } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Post } from "../../src/types";

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

export default function SearchScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggested, setSuggested] = useState<SearchUser[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [recent, setRecent] = useState<SearchUser[]>([]);

  const [discoverPosts, setDiscoverPosts] = useState<Post[]>([]);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [discoverLoadingMore, setDiscoverLoadingMore] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    api
      .get(`${API.users.search}?q=${encodeURIComponent(debouncedQuery)}`)
      .then(({ data }) => {
        if (!active) return;
        setResults(data.data || data.users || data || []);
      })
      .catch(() => {
        if (active) setResults([]);
      })
      .finally(() => {
        if (active) setSearching(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    let active = true;
    api
      .get(`${API.users.suggested}?limit=10`)
      .then(({ data }) => {
        if (!active) return;
        setSuggested(data.data || data.users || data || []);
      })
      .catch(() => {
        if (active) setSuggested([]);
      })
      .finally(() => {
        if (active) setSuggestedLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchDiscoverPage = useCallback(async (page: number) => {
    // Recommended is personalized (follows + recent tags) but can be empty
    // for a brand-new account — trending is the reliable fallback, same as
    // Instagram's explore grid falling back to globally popular content.
    try {
      const { data } = await api.get(`${API.posts.recommended}?page=${page}&limit=24`);
      const posts: Post[] = data.posts || [];
      if (posts.length > 0 || page > 1) {
        return { posts, hasMore: !!data.pagination?.hasMore };
      }
    } catch {}
    try {
      const { data } = await api.get(`${API.posts.trending}?page=${page}&limit=24`);
      return { posts: data.posts || [], hasMore: !!data.pagination?.hasMore };
    } catch {
      return { posts: [], hasMore: false };
    }
  }, []);

  useEffect(() => {
    let active = true;
    setDiscoverLoading(true);
    fetchDiscoverPage(1).then(({ posts, hasMore }) => {
      if (!active) return;
      setDiscoverPosts(posts);
      setDiscoverHasMore(hasMore);
      setDiscoverPage(1);
      setDiscoverLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchDiscoverPage]);

  const loadMoreDiscover = useCallback(async () => {
    if (discoverLoadingMore || !discoverHasMore || query.trim().length > 0) return;
    setDiscoverLoadingMore(true);
    const nextPage = discoverPage + 1;
    const { posts, hasMore } = await fetchDiscoverPage(nextPage);
    setDiscoverPosts((prev) => [...prev, ...posts]);
    setDiscoverHasMore(hasMore);
    setDiscoverPage(nextPage);
    setDiscoverLoadingMore(false);
  }, [discoverLoadingMore, discoverHasMore, discoverPage, fetchDiscoverPage, query]);

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
    setSuggested(apply);
    setResults(apply);
    try {
      await api.post(API.users.follow(user.id));
    } catch {
      const revert = (list: SearchUser[]) =>
        list.map((u) => (u.id === user.id ? { ...u, isFollowing: wasFollowing } : u));
      setSuggested(revert);
      setResults(revert);
    }
  }, []);

  const hasQuery = query.trim().length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Search</Text>
      </View>

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
            ) : null
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
      ) : discoverLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key="discover-grid"
          data={discoverPosts}
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
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
            ) : null
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
                  <Image source={{ uri: thumb.url }} style={styles.discoverGridImage} resizeMode="cover" />
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
    </View>
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
        <Image
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
        <PressableScale
          scaleTo={0.9}
          onPress={onFollow}
          style={[
            styles.followBtn,
            user.isFollowing
              ? { backgroundColor: colors.muted, borderColor: colors.border + "60", borderWidth: 1 }
              : { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.followBtnText,
              { color: user.isFollowing ? colors.foreground : colors.primaryForeground },
            ]}
          >
            {user.isFollowing ? "Following" : "Follow"}
          </Text>
        </PressableScale>
      </View>
    </Animated.View>
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
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
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
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    ...Typography.body,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
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
    paddingVertical: 8,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  userRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  resultMeta: { flex: 1 },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  username: { fontFamily: FontFamily.semibold, fontSize: FontSize.base, lineHeight: 21 },
  displayName: { ...Typography.caption, marginTop: 2 },
  followBtn: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: {
    ...Typography.button,
  },
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
