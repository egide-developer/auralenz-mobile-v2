import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useRepositoryQuery } from "./useRepositoryQuery";
import { repositoryTopic } from "../repositories/changes";
import { getProfile, upsertProfile, getProfileWithPosts } from "../repositories/profiles";
import { listPostsByAuthorIncludingPending, upsertPosts } from "../repositories/posts";
import { mapProfilePayload, mapUserProfilePayload, mapPostPayload } from "../repositories/profileMappers";
import api from "../api/client";
import { API } from "../api/endpoints";
import type { ProfileWrite } from "../repositories/profiles";
import type { PostWrite } from "../repositories/posts";

interface UseProfileResult {
  profile: ProfileWrite | null;
  posts: PostWrite[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useOwnProfile(): UseProfileResult {
  const userId = useAuthStore((state) => state.user?.id);
  const user = useAuthStore((state) => state.user);

  const loadLocal = useCallback(async () => {
    if (!userId) return null;
    const [localProfile, localPosts] = await Promise.all([
      getProfile(userId, userId),
      listPostsByAuthorIncludingPending(userId, userId, 12),
    ]);
    return { profile: localProfile, posts: localPosts };
  }, [userId]);

  const { data, isLoading, error, refresh } = useRepositoryQuery(
    repositoryTopic(userId ?? "", "profiles"),
    loadLocal,
    repositoryTopic(userId ?? "", "profiles"),
  );

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: response } = await api.get(API.auth.profile);
      const refreshedUser = response.user || response.data || response;
      if (!refreshedUser || typeof refreshedUser !== "object") {
        throw new Error("The server returned an invalid profile");
      }
      const mappedProfile = mapProfilePayload(refreshedUser);
      if (mappedProfile) {
        await upsertProfile(userId, mappedProfile);
      }
    } catch (error) {
      console.warn("Profile refresh failed", error);
      throw error;
    }
  }, [userId]);

  const refreshPosts = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: response } = await api.get(API.users.byUsername(user?.username ?? ""));
      const mapped = mapUserProfilePayload(response);
      if (mapped) {
        await upsertProfile(userId, mapped.profile);
        if (mapped.posts.length > 0) {
          await upsertPosts(userId, mapped.posts);
        }
      }
    } catch (error) {
      console.warn("Posts refresh failed", error);
      throw error;
    }
  }, [userId, user?.username]);

  const combinedRefresh = useCallback(async () => {
    await Promise.all([refreshProfile(), refreshPosts()]);
  }, [refreshProfile, refreshPosts]);

  return {
    profile: data?.profile ?? null,
    posts: data?.posts ?? [],
    isLoading,
    error,
    refresh: combinedRefresh,
  };
}

export function useUserProfile(username: string): UseProfileResult {
  const userId = useAuthStore((state) => state.user?.id);
  const isSelf = useAuthStore((state) => state.user?.username === username);

  const loadLocal = useCallback(async () => {
    if (!userId) return null;
    if (isSelf) {
      const [localProfile, localPosts] = await Promise.all([
        getProfile(userId, userId),
        listPostsByAuthorIncludingPending(userId, userId, 12),
      ]);
      return { profile: localProfile, posts: localPosts };
    }
    const [localProfile, localPosts] = await Promise.all([
      getProfile(userId, username),
      listPostsByAuthorIncludingPending(userId, username, 12),
    ]);
    return { profile: localProfile, posts: localPosts };
  }, [userId, username, isSelf]);

  const { data, isLoading, error, refresh } = useRepositoryQuery(
    repositoryTopic(userId ?? "", "profiles"),
    loadLocal,
    `profile:${username}`,
  );

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: response } = await api.get(API.users.byUsername(username));
      const mapped = mapUserProfilePayload(response);
      if (mapped) {
        await upsertProfile(userId, mapped.profile);
        if (mapped.posts.length > 0) {
          await upsertPosts(userId, mapped.posts);
        }
      }
    } catch (error) {
      console.warn("User profile refresh failed", error);
      throw error;
    }
  }, [userId, username]);

  return {
    profile: data?.profile ?? null,
    posts: data?.posts ?? [],
    isLoading,
    error,
    refresh: refreshProfile,
  };
}

export function useUserPosts(authorId: string, limit = 12) {
  const userId = useAuthStore((state) => state.user?.id);
  const isSelf = userId === authorId;
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadLocal = useCallback(async () => {
    if (!userId) return [];
    return listPostsByAuthorIncludingPending(userId, authorId, limit);
  }, [userId, authorId, limit]);

  const { data, isLoading, error, refresh } = useRepositoryQuery(
    repositoryTopic(userId ?? "", "posts"),
    loadLocal,
    `posts:${authorId}:${limit}`,
  );

  const refreshPosts = useCallback(async () => {
    if (!userId) return;
    try {
      const endpoint = isSelf ? API.posts.list : API.posts.byUser(authorId);
      const { data: response } = await api.get(`${endpoint}?limit=${limit}`);
      const posts = mapPostsListPayload(response, authorId);
      if (posts.length > 0) {
        await upsertPosts(userId, posts);
      }
    } catch (error) {
      console.warn("Posts refresh failed", error);
      throw error;
    }
  }, [userId, authorId, limit, isSelf]);

  const loadMorePosts = useCallback(async () => {
    if (!userId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextCursor = cursor;
    try {
      const endpoint = isSelf ? API.posts.list : API.posts.byUser(authorId);
      const { data: response } = await api.get(`${endpoint}?limit=${limit}${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ''}`);
      const posts = mapPostsListPayload(response, authorId);
      if (posts.length > 0) {
        await upsertPosts(userId, posts);
        setCursor(response.pagination?.cursor ?? null);
        setHasMore(posts.length === limit);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.warn("Load more posts failed", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [userId, authorId, limit, isSelf, cursor, loadingMore, hasMore]);

  return {
    posts: data ?? [],
    isLoading,
    error,
    refresh: refreshPosts,
    cursor,
    hasMore,
    loadingMore,
    loadMore: loadMorePosts,
  };
}

function mapPostsListPayload(value: unknown, authorId?: string): PostWrite[] {
  if (typeof value !== "object" || value === null) return [];
  const record = value as Record<string, unknown>;
  const dataRecord = typeof record.data === "object" && record.data !== null ? record.data as Record<string, unknown> : record;
  const postsArray = Array.isArray(dataRecord.posts) ? dataRecord.posts : [];

  return postsArray.flatMap((post) => {
    const mapped = mapPostPayload(post, authorId);
    return mapped ? [mapped] : [];
  });
}