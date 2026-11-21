import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useRepositoryQuery } from "./useRepositoryQuery";
import { repositoryTopic } from "../repositories/changes";
import {
  buildSearchQueryKey,
  getCachedSearchResultsIfFresh,
  listRecentSearches,
  clearRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
  upsertSearchResults,
  removeExpiredSearchResults,
  type RecentSearch,
  type SearchFamily,
} from "../repositories/search";
import {
  mapApiPostsPayload,
  mapSearchUsersPayload,
  mapSuggestedUsersPayload,
  type UserPreview,
} from "../repositories/profileMappers";
import api from "../api/client";
import { API } from "../api/endpoints";
import type { JsonValue } from "../db/schema";
import type { Post } from "../types";

const SEARCH_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export interface SearchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/**
 * Cache-backed search read.
 *
 * `useRepositoryQuery` only ever reads the local cache, so a cold (or lapsed)
 * cache has to kick off the network fetch itself — without that the screen
 * stays empty forever. `requiresQuery` opts families that have no search term
 * (suggested, recommended, trending, tag counts) out of the empty-query guard.
 */
function useSearchCache<T>(
  userId: string | undefined,
  family: SearchFamily,
  query: string,
  page: number,
  limit: number,
  loadFromApi: () => Promise<T>,
  mapFn: (value: unknown) => T,
  requiresQuery = true,
): SearchResult<T> {
  const queryKey = buildSearchQueryKey(family, query, page, limit);
  const cacheTopic = repositoryTopic(userId ?? "", "search");
  const hasQuery = !requiresQuery || query.trim().length > 0;

  const loadLocal = useCallback(async () => {
    if (!userId || !hasQuery) return null;
    const cached = await getCachedSearchResultsIfFresh(userId, queryKey);
    return (cached?.results as T | undefined) ?? null;
  }, [userId, queryKey, hasQuery]);

  const {
    data,
    isLoading: isLoadingLocal,
    error: localError,
  } = useRepositoryQuery(cacheTopic, loadLocal, queryKey);

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const attemptedKeyRef = useRef<string | null>(null);
  // A response for a term the user has already moved on from must not paint
  // its error (or clear one) onto the results now on screen.
  const currentKeyRef = useRef(queryKey);
  currentKeyRef.current = queryKey;

  const refresh = useCallback(async () => {
    if (!userId || !hasQuery) return;
    setIsFetching(true);
    try {
      const response = await loadFromApi();
      const mapped = mapFn(response);
      await upsertSearchResults(userId, queryKey, mapped as unknown as JsonValue);
      if (currentKeyRef.current === queryKey) setFetchError(null);
    } catch (cause) {
      const error = toError(cause);
      console.warn(`Search refresh failed for ${family}`, error);
      if (currentKeyRef.current === queryKey) setFetchError(error);
      throw error;
    } finally {
      setIsFetching(false);
    }
  }, [userId, hasQuery, queryKey, loadFromApi, mapFn, family]);

  useEffect(() => {
    attemptedKeyRef.current = null;
    setFetchError(null);
  }, [queryKey]);

  useEffect(() => {
    if (!userId || !hasQuery) return;
    if (isLoadingLocal) return;
    if (data != null) return;
    if (attemptedKeyRef.current === queryKey) return;
    attemptedKeyRef.current = queryKey;
    void refresh().catch(() => {});
  }, [userId, hasQuery, isLoadingLocal, data, queryKey, refresh]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      removeExpiredSearchResults(userId, new Date(Date.now() - 10 * 60 * 1000).toISOString());
    }, SEARCH_CLEANUP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId]);

  // No cached row and no failure yet means the fetch is still in flight (or
  // about to start), which reads as loading rather than "nothing found".
  const isLoading =
    isLoadingLocal ||
    (data == null &&
      hasQuery &&
      userId != null &&
      fetchError == null &&
      localError == null);

  return {
    data: (data ?? null) as T | null,
    isLoading,
    error: fetchError ?? localError,
    refresh,
  };
}

export function useSearchUsers(query: string) {
  const userId = useAuthStore((state) => state.user?.id);

  const loadFromApi = useCallback(async () => {
    const { data } = await api.get(`${API.users.search}?q=${encodeURIComponent(query.trim())}`);
    return data;
  }, [query]);

  return useSearchCache<UserPreview[]>(
    userId,
    "users",
    query,
    1,
    20,
    loadFromApi,
    mapSearchUsersPayload,
  );
}

export function useSuggestedUsers() {
  const userId = useAuthStore((state) => state.user?.id);

  const loadFromApi = useCallback(async () => {
    const { data } = await api.get(`${API.users.suggested}?limit=10`);
    return data;
  }, []);

  return useSearchCache<UserPreview[]>(
    userId,
    "suggested",
    "",
    1,
    10,
    loadFromApi,
    mapSuggestedUsersPayload,
    false,
  );
}

/** Full post search — caption, tags and location all match the term. */
export function useSearchPosts(query: string, limit = 24) {
  const userId = useAuthStore((state) => state.user?.id);

  const loadFromApi = useCallback(async () => {
    const { data } = await api.get(API.posts.search, {
      params: { q: query.trim(), page: 1, limit },
    });
    return data;
  }, [query, limit]);

  return useSearchCache<Post[]>(
    userId,
    "posts",
    query,
    1,
    limit,
    loadFromApi,
    mapApiPostsPayload,
  );
}

export function useRecommendedPosts(page = 1, limit = 24) {
  const userId = useAuthStore((state) => state.user?.id);

  const loadFromApi = useCallback(async () => {
    try {
      const { data } = await api.get(`${API.posts.recommended}?page=${page}&limit=${limit}`);
      if (mapApiPostsPayload(data).length > 0 || page > 1) return data;
    } catch (cause) {
      console.warn("Recommended posts unavailable, falling back to trending", cause);
    }
    const { data } = await api.get(`${API.posts.trending}?page=${page}&limit=${limit}`);
    return data;
  }, [page, limit]);

  return useSearchCache<Post[]>(
    userId,
    "recommended",
    "",
    page,
    limit,
    loadFromApi,
    mapApiPostsPayload,
    false,
  );
}

export function useTrendingPosts(page = 1, limit = 24) {
  const userId = useAuthStore((state) => state.user?.id);

  const loadFromApi = useCallback(async () => {
    const { data } = await api.get(`${API.posts.trending}?page=${page}&limit=${limit}`);
    return data;
  }, [page, limit]);

  return useSearchCache<Post[]>(
    userId,
    "trending",
    "",
    page,
    limit,
    loadFromApi,
    mapApiPostsPayload,
    false,
  );
}

export interface TagCount {
  tag: string;
  total: number;
}

/** The count payload is already the final shape, so this only narrows it. */
const mapTagCounts = (value: unknown): TagCount[] =>
  Array.isArray(value) ? (value as TagCount[]) : [];

/** Real per-tag post totals (`pagination.total` for a `tags=` lookup). */
export function useTagCounts(tags: string[], limit = 5) {
  const userId = useAuthStore((state) => state.user?.id);

  const tagsKey = tags.join(",");
  const normalized = useMemo(() => {
    const unique = Array.from(
      new Set(
        tagsKey
          .split(",")
          .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
          .filter(Boolean),
      ),
    ).sort();
    return unique.slice(0, limit).join(",");
  }, [tagsKey, limit]);

  const loadFromApi = useCallback(async (): Promise<TagCount[]> => {
    const list = normalized ? normalized.split(",") : [];
    if (list.length === 0) return [];

    const counts = await Promise.all(
      list.map(async (tag) => {
        const { data } = await api.get(API.posts.search, {
          params: { tags: tag, limit: 1 },
        });
        const total = Number(data?.pagination?.total ?? 0);
        return { tag, total: Number.isFinite(total) ? total : 0 };
      }),
    );
    return counts;
  }, [normalized]);

  return useSearchCache<TagCount[]>(
    userId,
    "tagCounts",
    normalized,
    1,
    limit,
    loadFromApi,
    mapTagCounts,
    false,
  );
}

export interface TrendingTag {
  tag: string;
  total: number;
}

/**
 * Trending hashtags ranked by how many posts actually carry them. Candidates
 * come from the trending feed's tag frequency; the displayed number is the
 * real post count for that tag, not the sample size we counted over.
 *
 * Takes the trending feed result so the posts it needs are fetched once and
 * shared with the rest of the screen.
 */
export function useTrendingTags(
  source: SearchResult<Post[]>,
  limit = 5,
): SearchResult<TrendingTag[]> {
  const candidates = useMemo(() => {
    const frequency = new Map<string, number>();
    for (const post of source.data ?? []) {
      for (const raw of post.tags) {
        const tag = raw.trim().replace(/^#/, "").toLowerCase();
        if (!tag) continue;
        frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
      }
    }
    return [...frequency.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [source.data]);

  const counts = useTagCounts(candidates, limit);

  const data = useMemo(() => {
    if (!counts.data) return null;
    return [...counts.data]
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [counts.data]);

  return {
    data,
    isLoading: source.isLoading || counts.isLoading,
    error: source.error ?? counts.error,
    refresh: async () => {
      await Promise.all([source.refresh(), counts.refresh()]);
    },
  };
}

export interface RecentSearchesResult {
  data: RecentSearch[];
  isLoading: boolean;
  error: Error | null;
  record: (term: string) => Promise<void>;
  remove: (term: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => void;
}

export function useRecentSearches(): RecentSearchesResult {
  const userId = useAuthStore((state) => state.user?.id);
  const topic = repositoryTopic(userId ?? "", "recentSearches");

  const loadLocal = useCallback(async () => {
    if (!userId) return [] as RecentSearch[];
    return listRecentSearches(userId);
  }, [userId]);

  const { data, isLoading, error, refresh } = useRepositoryQuery<RecentSearch[]>(
    topic,
    loadLocal,
    topic,
  );

  const record = useCallback(
    async (term: string) => {
      if (!userId) return;
      await recordRecentSearch(userId, term);
    },
    [userId],
  );

  const remove = useCallback(
    async (term: string) => {
      if (!userId) return;
      await removeRecentSearch(userId, term);
    },
    [userId],
  );

  const clear = useCallback(async () => {
    if (!userId) return;
    await clearRecentSearches(userId);
  }, [userId]);

  return {
    data: data ?? [],
    isLoading,
    error,
    record,
    remove,
    clear,
    refresh,
  };
}
