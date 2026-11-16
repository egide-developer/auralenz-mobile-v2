import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useRepositoryQuery } from "./useRepositoryQuery";
import { repositoryTopic } from "../repositories/changes";
import {
  getCachedSearchResultsIfFresh,
  upsertSearchResults,
  buildSearchQueryKey,
  removeExpiredSearchResults,
  type SearchFamily,
} from "../repositories/search";
import {
  mapSearchUsersPayload,
  mapSuggestedUsersPayload,
  mapRecommendedPostsPayload,
  mapTrendingPostsPayload,
  type UserPreview,
  type PostWrite,
} from "../repositories/profileMappers";
import api from "../api/client";
import { API } from "../api/endpoints";
import type { JsonValue } from "../db/schema";

const SEARCH_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export interface SearchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

function useSearchCache<T>(
  userId: string | undefined,
  family: SearchFamily,
  query: string,
  page: number,
  limit: number,
  loadFromApi: () => Promise<T>,
  mapFn: (value: unknown) => T,
): SearchResult<T> {
  const queryKey = buildSearchQueryKey(family, query, page, limit);
  const cacheTopic = repositoryTopic(userId ?? "", "search");

  const loadLocal = useCallback(async () => {
    if (!userId || !query.trim()) return null;
    const cached = await getCachedSearchResultsIfFresh(userId, queryKey);
    return cached?.results as T ?? null;
  }, [userId, queryKey]);

  const { data, isLoading, error, refresh: refreshCache } = useRepositoryQuery(
    cacheTopic,
    loadLocal,
    queryKey,
  );

  const refresh = useCallback(async () => {
    if (!userId || !query.trim()) return;
    try {
      const response = await loadFromApi();
      const mapped = mapFn(response);
      await upsertSearchResults(userId, queryKey, mapped as unknown as JsonValue);
    } catch (error) {
      console.warn(`Search refresh failed for ${family}`, error);
      throw error;
    }
  }, [userId, queryKey, loadFromApi, mapFn]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      removeExpiredSearchResults(userId, new Date(Date.now() - 10 * 60 * 1000).toISOString());
    }, SEARCH_CLEANUP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId]);

  return {
    data: data ?? null,
    isLoading,
    error,
    refresh,
  };
}

export function useSearchUsers(query: string) {
  const userId = useAuthStore((state) => state.user?.id);

  const loadFromApi = useCallback(async () => {
    const { data } = await api.get(`${API.users.search}?q=${encodeURIComponent(query)}`);
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
  );
}

export function useRecommendedPosts(page = 1, limit = 24, isQueryActive = false) {
  const userId = useAuthStore((state) => state.user?.id);

  const loadFromApi = useCallback(async () => {
    const { data } = await api.get(`${API.posts.recommended}?page=${page}&limit=${limit}`);
    return data;
  }, [page, limit]);

  const fallbackToTrending = useCallback(async () => {
    const { data } = await api.get(`${API.posts.trending}?page=${page}&limit=${limit}`);
    return data;
  }, [page, limit]);

  const loadWithFallback = useCallback(async () => {
    try {
      const response = await loadFromApi();
      const posts = mapRecommendedPostsPayload(response);
      if (posts.length > 0 || page > 1) return response;
    } catch {}
    return fallbackToTrending();
  }, [loadFromApi, fallbackToTrending, page]);

  return useSearchCache<PostWrite[]>(
    userId,
    "recommended",
    isQueryActive ? "query" : "",
    page,
    limit,
    loadWithFallback,
    mapRecommendedPostsPayload,
  );
}

export function useTrendingPosts(page = 1, limit = 24) {
  const userId = useAuthStore((state) => state.user?.id);

  const loadFromApi = useCallback(async () => {
    const { data } = await api.get(`${API.posts.trending}?page=${page}&limit=${limit}`);
    return data;
  }, [page, limit]);

  return useSearchCache<PostWrite[]>(
    userId,
    "trending",
    "",
    page,
    limit,
    loadFromApi,
    mapTrendingPostsPayload,
  );
}