import { useCallback, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Gap, Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import { Screen } from "../../src/components/layout";
import {
  PostGridSkeleton,
  SearchUserSkeleton,
  SearchUserSkeletonList,
} from "../../src/components/skeletons";
import {
  PostTile,
  RecentSearches,
  SearchFilters,
  SearchStatus,
  SectionTitle,
  TagRow,
  TrendingTags,
  UserRow,
  type SearchFilterKey,
} from "../../src/components/search";
import {
  useRecommendedPosts,
  useRecentSearches,
  useSearchPosts,
  useSearchUsers,
  useSuggestedUsers,
  useTagCounts,
  useTrendingPosts,
  useTrendingTags,
} from "../../src/hooks/useSearch";
import { mapApiPostsPayload } from "../../src/repositories/profileMappers";
import { useAuthStore } from "../../src/stores/authStore";
import { showToast } from "../../src/stores/toastStore";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Post, UserPreview } from "../../src/types";

const GRID_GAP = 2;
const DISCOVER_PAGE_SIZE = 24;

function applyPostFilter(posts: Post[], filter: SearchFilterKey): Post[] {
  if (filter === "media") {
    return posts.filter((post) =>
      post.media.some((item) => item.type === "image" || item.type === "video"),
    );
  }
  if (filter === "places") {
    return posts.filter((post) => Boolean(post.location));
  }
  return posts;
}

function collectTags(posts: Post[], match?: string): string[] {
  const needle = match?.trim().toLowerCase();
  const frequency = new Map<string, number>();
  for (const post of posts) {
    for (const raw of post.tags) {
      const tag = raw.trim().replace(/^#/, "").toLowerCase();
      if (!tag) continue;
      if (needle && !tag.includes(needle)) continue;
      frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
    }
  }
  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}

interface UserListViewProps {
  listKey: string;
  users: UserPreview[];
  query?: string;
  currentUserId?: string;
  isFollowing: (user: UserPreview) => boolean;
  onSelect: (user: UserPreview) => void;
  onFollow: (user: UserPreview) => void;
  header?: ReactElement;
  empty: ReactElement;
  refreshControl: ReactElement;
}

function UserListView({
  listKey,
  users,
  query,
  currentUserId,
  isFollowing,
  onSelect,
  onFollow,
  header,
  empty,
  refreshControl,
}: UserListViewProps) {
  return (
    <FlatList
      key={listKey}
      style={styles.list}
      data={users}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item }) => (
        <UserRow
          user={item}
          query={query}
          isFollowing={isFollowing(item)}
          isSelf={item.id === currentUserId}
          onPress={() => onSelect(item)}
          onFollow={() => onFollow(item)}
        />
      )}
    />
  );
}

interface PostGridViewProps {
  listKey: string;
  posts: Post[];
  itemSize: number;
  onOpen: (post: Post) => void;
  header?: ReactElement;
  empty: ReactElement;
  footer?: ReactElement;
  onEndReached?: () => void;
  refreshControl: ReactElement;
}

function PostGridView({
  listKey,
  posts,
  itemSize,
  onOpen,
  header,
  empty,
  footer,
  onEndReached,
  refreshControl,
}: PostGridViewProps) {
  return (
    <FlatList
      key={listKey}
      style={styles.list}
      data={posts}
      numColumns={2}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      onEndReachedThreshold={0.5}
      onEndReached={onEndReached}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      renderItem={({ item }) => (
        <PostTile post={item} size={itemSize} onPress={() => onOpen(item)} />
      )}
    />
  );
}

interface TagListViewProps {
  listKey: string;
  tags: { tag: string; total: number }[];
  query?: string;
  onSelect: (tag: string) => void;
  header?: ReactElement;
  empty: ReactElement;
  refreshControl: ReactElement;
}

function TagListView({ listKey, tags, query, onSelect, header, empty, refreshControl }: TagListViewProps) {
  return (
    <FlatList
      key={listKey}
      style={styles.list}
      data={tags}
      keyExtractor={(item) => item.tag}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderItem={({ item }) => (
        <TagRow tag={item.tag} total={item.total} query={query} onSelect={onSelect} />
      )}
    />
  );
}

export default function SearchScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const itemSize = Math.max(0, Math.floor((width - Spacing.lg * 2 - GRID_GAP) / 2));

  const currentUserId = useAuthStore((state) => state.user?.id);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilterKey>("top");
  const [refreshing, setRefreshing] = useState(false);
  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>({});

  const [discoverExtra, setDiscoverExtra] = useState<Post[]>([]);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const hasQuery = debouncedQuery.length > 0;

  const usersResult = useSearchUsers(debouncedQuery);
  const postsResult = useSearchPosts(debouncedQuery);
  const suggestedResult = useSuggestedUsers();
  const discoverResult = useRecommendedPosts(1, DISCOVER_PAGE_SIZE);
  const trendingResult = useTrendingPosts(1, 30);
  const trendingTagsResult = useTrendingTags(trendingResult, 5);
  const recents = useRecentSearches();

  const suggested = suggestedResult.data ?? [];
  const trendingPosts = trendingResult.data ?? [];
  const trendingTags = trendingTagsResult.data ?? [];
  const people = usersResult.data ?? [];
  const postResults = postsResult.data ?? [];
  const recentSearches = recents.data;

  // Reset the appended explore pages whenever the first page changes.
  useEffect(() => {
    setDiscoverExtra([]);
    setDiscoverPage(1);
    setDiscoverHasMore(true);
  }, [discoverResult.data]);

  const discoverPosts = useMemo(
    () => [...(discoverResult.data ?? []), ...discoverExtra],
    [discoverResult.data, discoverExtra],
  );

  const queryLower = debouncedQuery.toLowerCase();

  const resultTags = useMemo(
    () => (filter === "tags" && hasQuery ? collectTags(postResults, queryLower) : []),
    [filter, hasQuery, postResults, queryLower],
  );
  const resultTagCounts = useTagCounts(resultTags, 6);
  const tagResults = useMemo(() => {
    if (!resultTagCounts.data) return [];
    return [...resultTagCounts.data]
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [resultTagCounts.data]);

  const browseGrid = useMemo(
    () => applyPostFilter(discoverPosts, filter),
    [discoverPosts, filter],
  );
  const queryGrid = useMemo(
    () => applyPostFilter(postResults, filter),
    [postResults, filter],
  );

  const isFollowing = useCallback(
    (user: UserPreview) => followOverrides[user.id] ?? false,
    [followOverrides],
  );

  const toggleFollow = useCallback(
    async (user: UserPreview) => {
      const previous = followOverrides[user.id] ?? false;
      setFollowOverrides((prev) => ({ ...prev, [user.id]: !previous }));
      try {
        const { data } = await api.post(API.users.follow(user.id));
        if (typeof data?.isFollowing === "boolean") {
          setFollowOverrides((prev) => ({ ...prev, [user.id]: data.isFollowing }));
        }
      } catch (cause) {
        console.warn("Follow toggle failed", cause);
        setFollowOverrides((prev) => ({ ...prev, [user.id]: previous }));
        showToast("Couldn't update follow", "error");
      }
    },
    [followOverrides],
  );

  const openPost = useCallback((post: Post) => {
    const hasVideo = post.media?.some((item) => item.type === "video");
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

  const rememberTerm = useCallback(
    (term: string) => {
      void recents.record(term).catch((cause) => {
        console.warn("Couldn't save recent search", cause);
      });
    },
    [recents],
  );

  const openUser = useCallback(
    (user: UserPreview) => {
      rememberTerm(user.username);
      router.push(`/profile/${user.username}`);
    },
    [rememberTerm],
  );

  const selectTerm = useCallback(
    (term: string) => {
      rememberTerm(term);
      setQuery(term);
    },
    [rememberTerm],
  );

  const selectTag = useCallback(
    (tag: string) => {
      rememberTerm(tag);
      setQuery(tag);
    },
    [rememberTerm],
  );

  const cancelSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setFilter("top");
    Keyboard.dismiss();
  }, []);

  const commitQuery = useCallback(() => {
    const term = query.trim();
    if (term.length < 2) return;
    rememberTerm(term);
    Keyboard.dismiss();
  }, [query, rememberTerm]);

  const loadMoreDiscover = useCallback(async () => {
    if (loadingMore || !discoverHasMore || hasQuery) return;
    setLoadingMore(true);
    const nextPage = discoverPage + 1;
    try {
      const { data } = await api.get(
        `${API.posts.recommended}?page=${nextPage}&limit=${DISCOVER_PAGE_SIZE}`,
      );
      const rows = mapApiPostsPayload(data);
      if (rows.length === 0) {
        setDiscoverHasMore(false);
        return;
      }
      setDiscoverExtra((prev) => [...prev, ...rows]);
      setDiscoverPage(nextPage);
      setDiscoverHasMore(rows.length === DISCOVER_PAGE_SIZE);
    } catch (cause) {
      console.warn("Load more explore posts failed", cause);
      setDiscoverHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, discoverHasMore, hasQuery, discoverPage]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const jobs: Promise<void>[] = [
        discoverResult.refresh(),
        trendingResult.refresh(),
        suggestedResult.refresh(),
        trendingTagsResult.refresh(),
      ];
      if (hasQuery) {
        jobs.push(usersResult.refresh(), postsResult.refresh(), resultTagCounts.refresh());
      }
      await Promise.allSettled(jobs);
    } finally {
      setRefreshing(false);
    }
  }

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  const header = (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>Explore Search</Text>
      <TouchableOpacity accessibilityLabel="Refresh" hitSlop={8} onPress={handleRefresh}>
        <Icon name="refresh" set="light" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  const controls = (
    <View>
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card },
            Shadows[isDark ? "dark" : "light"].soft,
          ]}
        >
          <Icon name="search" set="light" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people, posts, tags..."
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={commitQuery}
            accessibilityLabel="Search"
          />
          {query.length > 0 ? (
            <TouchableOpacity
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => setQuery("")}
            >
              <Icon name="close" set="light" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
        {query.length > 0 ? (
          <TouchableOpacity accessibilityLabel="Cancel search" hitSlop={8} onPress={cancelSearch}>
            <Text style={[styles.cancel, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <SearchFilters value={filter} onChange={setFilter} />
    </View>
  );

  const shell = (content: ReactNode) => (
    <Screen header={header}>
      <View style={styles.body}>
        {controls}
        {content}
      </View>
    </Screen>
  );

  const userRow = (user: UserPreview, listQuery?: string) => (
    <UserRow
      key={user.id}
      user={user}
      query={listQuery}
      isFollowing={isFollowing(user)}
      isSelf={user.id === currentUserId}
      onPress={() => openUser(user)}
      onFollow={() => void toggleFollow(user)}
    />
  );

  const suggestedBody = suggestedResult.isLoading ? (
    <View>
      {Array.from({ length: 4 }).map((_, index) => (
        <SearchUserSkeleton key={index} showVerified={index === 1} />
      ))}
    </View>
  ) : suggestedResult.error && suggested.length === 0 ? (
    <SearchStatus
      message="Couldn't load suggestions"
      error={suggestedResult.error}
      onRetry={() => void suggestedResult.refresh().catch(() => {})}
    />
  ) : suggested.length === 0 ? (
    <SearchStatus iconName="add-user" message="No suggestions right now" />
  ) : (
    <View>{suggested.map((user) => userRow(user))}</View>
  );

  const trendingTagsBody = trendingTagsResult.isLoading ? (
    <View>
      {Array.from({ length: 3 }).map((_, index) => (
        <SearchUserSkeleton key={index} showFollow={false} />
      ))}
    </View>
  ) : trendingTagsResult.error && trendingTags.length === 0 ? (
    <SearchStatus
      message="Couldn't load trending tags"
      error={trendingTagsResult.error}
      onRetry={() => void trendingTagsResult.refresh().catch(() => {})}
    />
  ) : (
    <TrendingTags tags={trendingTags} onSelect={selectTag} />
  );

  const recentSection = (
    <RecentSearches
      searches={recentSearches}
      query={query}
      onSelect={selectTerm}
      onRemove={(term) => void recents.remove(term).catch(() => {})}
      onClear={() => void recents.clear().catch(() => {})}
    />
  );

  const browseGridEmpty = discoverResult.error ? (
    <SearchStatus
      iconName="discovery"
      message="Couldn't load the explore grid"
      error={discoverResult.error}
      onRetry={() => void discoverResult.refresh().catch(() => {})}
    />
  ) : (
    <SearchStatus iconName="discovery" message="Nothing to explore yet" />
  );

  const queryEmpty = usersResult.isLoading || postsResult.isLoading ? (
    <PostGridSkeleton rows={2} horizontalPadding={0} />
  ) : (usersResult.error ?? postsResult.error) ? (
    <SearchStatus
      message="Couldn't run that search"
      error={usersResult.error ?? postsResult.error}
      onRetry={() => {
        void Promise.allSettled([usersResult.refresh(), postsResult.refresh()]);
      }}
    />
  ) : people.length > 0 ? (
    <SearchStatus message="No posts found" />
  ) : (
    <SearchStatus message={`No results for “${debouncedQuery}”`} />
  );

  const queryTopHeader = (
    <View>
      {people.length > 0 || usersResult.isLoading || usersResult.error ? (
        <View>
          <SectionTitle title="People" iconName="people" />
          {usersResult.isLoading ? (
            <View>
              {Array.from({ length: 3 }).map((_, index) => (
                <SearchUserSkeleton key={index} showVerified={index === 1} />
              ))}
            </View>
          ) : usersResult.error && people.length === 0 ? (
            <SearchStatus
              message="Couldn't load people"
              error={usersResult.error}
              onRetry={() => void usersResult.refresh().catch(() => {})}
            />
          ) : (
            people.map((user) => userRow(user, debouncedQuery))
          )}
        </View>
      ) : null}
      <SectionTitle title="Posts" iconName="image" />
    </View>
  );

  const browseTopHeader = (
    <View>
      {recentSection}
      {trendingTagsBody}
      <SectionTitle title="Suggested for you" iconName="people" />
      {suggestedBody}
    </View>
  );

  /* ── Browse (no query) ─────────────────────────────────────────────── */
  if (!hasQuery) {
    if (filter === "users") {
      if (suggestedResult.isLoading && suggested.length === 0) {
        return shell(<SearchUserSkeletonList count={6} />);
      }
      return shell(
        <UserListView
          listKey="browse-users"
          users={suggested}
          currentUserId={currentUserId}
          isFollowing={isFollowing}
          onSelect={openUser}
          onFollow={(user) => void toggleFollow(user)}
          header={<SectionTitle title="Suggested for you" iconName="people" />}
          empty={
            suggestedResult.error ? (
              <SearchStatus
                message="Couldn't load suggestions"
                error={suggestedResult.error}
                onRetry={() => void suggestedResult.refresh().catch(() => {})}
              />
            ) : (
              <SearchStatus iconName="add-user" message="No suggestions right now" />
            )
          }
          refreshControl={refreshControl}
        />,
      );
    }

    if (filter === "tags") {
      if (trendingTagsResult.isLoading && trendingTags.length === 0) {
        return shell(<SearchUserSkeletonList count={5} />);
      }
      return shell(
        <TagListView
          listKey="browse-tags"
          tags={trendingTags}
          onSelect={selectTag}
          header={<SectionTitle title="Trending now" iconName="flame" />}
          empty={
            trendingTagsResult.error ? (
              <SearchStatus
                iconName="flame"
                message="Couldn't load trending tags"
                error={trendingTagsResult.error}
                onRetry={() => void trendingTagsResult.refresh().catch(() => {})}
              />
            ) : (
              <SearchStatus iconName="pricetag" message="No trending tags yet" />
            )
          }
          refreshControl={refreshControl}
        />,
      );
    }

    if (filter === "posts") {
      if (trendingResult.isLoading && trendingPosts.length === 0) {
        return shell(<PostGridSkeleton rows={3} />);
      }
      return shell(
        <PostGridView
          listKey="browse-posts"
          posts={trendingPosts}
          itemSize={itemSize}
          onOpen={openPost}
          header={<SectionTitle title="Trending posts" iconName="flame" />}
          empty={
            trendingResult.error ? (
              <SearchStatus
                message="Couldn't load trending posts"
                error={trendingResult.error}
                onRetry={() => void trendingResult.refresh().catch(() => {})}
              />
            ) : (
              <SearchStatus iconName="discovery" message="Nothing trending right now" />
            )
          }
          refreshControl={refreshControl}
        />,
      );
    }

    // top / media / places all read the explore grid.
    if (discoverResult.isLoading && browseGrid.length === 0) {
      return shell(<PostGridSkeleton rows={3} />);
    }
    const showSections = filter === "top";
    return shell(
      <PostGridView
        listKey={`browse-${filter}`}
        posts={browseGrid}
        itemSize={itemSize}
        onOpen={openPost}
        onEndReached={loadMoreDiscover}
        header={showSections ? browseTopHeader : <SectionTitle title={filter === "media" ? "Media" : "Places"} />}
        footer={loadingMore ? <PostGridSkeleton rows={1} horizontalPadding={0} /> : undefined}
        empty={browseGridEmpty}
        refreshControl={refreshControl}
      />,
    );
  }

  /* ── Query results ─────────────────────────────────────────────────── */
  if (filter === "users") {
    if (usersResult.isLoading && people.length === 0) {
      return shell(<SearchUserSkeletonList count={6} />);
    }
    return shell(
      <UserListView
        listKey="query-users"
        users={people}
        query={debouncedQuery}
        currentUserId={currentUserId}
        isFollowing={isFollowing}
        onSelect={openUser}
        onFollow={(user) => void toggleFollow(user)}
        empty={
          usersResult.error ? (
            <SearchStatus
              message="Couldn't run that search"
              error={usersResult.error}
              onRetry={() => void usersResult.refresh().catch(() => {})}
            />
          ) : (
            <SearchStatus message={`No people found for “${debouncedQuery}”`} />
          )
        }
        refreshControl={refreshControl}
      />,
    );
  }

  if (filter === "tags") {
    const tagsLoading = postsResult.isLoading || resultTagCounts.isLoading;
    if (tagsLoading && tagResults.length === 0) {
      return shell(<SearchUserSkeletonList count={5} />);
    }
    return shell(
      <TagListView
        listKey="query-tags"
        tags={tagResults}
        query={debouncedQuery}
        onSelect={selectTag}
        empty={
          postsResult.error ?? resultTagCounts.error ? (
            <SearchStatus
              iconName="pricetag"
              message="Couldn't look up tags"
              error={postsResult.error ?? resultTagCounts.error}
              onRetry={() => {
                void Promise.allSettled([postsResult.refresh(), resultTagCounts.refresh()]);
              }}
            />
          ) : (
            <SearchStatus iconName="pricetag" message={`No tags found for “${debouncedQuery}”`} />
          )
        }
        refreshControl={refreshControl}
      />,
    );
  }

  if (postsResult.isLoading && queryGrid.length === 0) {
    return shell(<PostGridSkeleton rows={3} />);
  }

  const peopleOnly = filter === "top" ? queryTopHeader : undefined;
  const gridEmpty =
    filter === "top" ? (
      queryEmpty
    ) : postsResult.error ? (
      <SearchStatus
        message="Couldn't run that search"
        error={postsResult.error}
        onRetry={() => void postsResult.refresh().catch(() => {})}
      />
    ) : (
      <SearchStatus
        message={`No ${filter === "media" ? "media" : filter === "places" ? "places" : "posts"} found for “${debouncedQuery}”`}
      />
    );

  return shell(
    <PostGridView
      listKey={`query-${filter}`}
      posts={queryGrid}
      itemSize={itemSize}
      onOpen={openPost}
      header={peopleOnly}
      empty={gridEmpty}
      refreshControl={refreshControl}
    />,
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.sm,
    height: 44,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.xl,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 0,
  },
  cancel: {
    ...Typography.button,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
});
