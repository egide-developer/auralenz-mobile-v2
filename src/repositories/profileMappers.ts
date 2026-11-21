import type {
  ProfileCounts,
  PostMedia,
  JsonValue,
} from "../db/schema";
import type { User, Post, UserPreview } from "../types";
import type { ProfileWrite } from "./profiles";
import type { PostWrite } from "./posts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function mapUserPreview(value: unknown): UserPreview | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id) ?? stringValue(value._id);
  if (!id) return null;

  const username = stringValue(value.username);
  const displayName = stringValue(value.displayName) ?? stringValue(value.name);
  const avatarUrl =
    stringValue(value.avatarUrl) ?? stringValue(value.avatar);
  const isVerified = booleanValue(value.isVerified) ?? false;
  const isOnline = booleanValue(value.isOnline);
  const hasStory = booleanValue(value.hasStory);
  const hasUnviewedStory = booleanValue(value.hasUnviewedStory);
  const bio = stringValue(value.bio);
  const followersCount = numberValue(value.followersCount);

  return {
    id,
    username: username ?? "",
    displayName,
    avatarUrl,
    bio: bio ?? undefined,
    followersCount: followersCount ?? undefined,
    isVerified,
    ...(isOnline !== null ? { isOnline } : {}),
    ...(hasStory !== null ? { hasStory } : {}),
    ...(hasUnviewedStory !== null ? { hasUnviewedStory } : {}),
  };
}

function mapPostMedia(value: unknown): PostMedia | null {
  if (!isRecord(value)) return null;
  const url = stringValue(value.url);
  if (!url) return null;

  const typeValue = stringValue(value.type);
  const type: PostMedia["type"] =
    typeValue === "image" || typeValue === "video" || typeValue === "audio"
      ? typeValue
      : "image";

  return {
    url,
    type,
    ...(stringValue(value.thumbnailUrl) ? { thumbnailUrl: stringValue(value.thumbnailUrl)! } : {}),
    ...(numberValue(value.width) ? { width: numberValue(value.width)! } : {}),
    ...(numberValue(value.height) ? { height: numberValue(value.height)! } : {}),
    ...(numberValue(value.aspectRatio) ? { aspectRatio: numberValue(value.aspectRatio)! } : {}),
    ...(numberValue(value.duration) ? { duration: numberValue(value.duration)! } : {}),
  };
}

function mapPostMediaArray(value: unknown): PostMedia[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const mapped = mapPostMedia(item);
    return mapped ? [mapped] : [];
  });
}

function mapProfileCounts(value: unknown): ProfileCounts {
  if (!isRecord(value)) return { posts: 0, followers: 0, following: 0 };
  return {
    posts: numberValue(value.posts) ?? numberValue(value.postsCount) ?? 0,
    followers: numberValue(value.followers) ?? numberValue(value.followersCount) ?? 0,
    following: numberValue(value.following) ?? numberValue(value.followingCount) ?? 0,
  };
}

export function mapProfilePayload(value: unknown): ProfileWrite | null {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id) ?? stringValue(value._id);
  if (!id) return null;

  const username = stringValue(value.username);
  if (!username) return null;

  const displayName = stringValue(value.displayName) ?? stringValue(value.name);
  const bio = stringValue(value.bio);
  const avatar = stringValue(value.avatarUrl) ?? stringValue(value.avatar);
  const counts = mapProfileCounts(value);
  const updatedAt = stringValue(value.updatedAt) ?? new Date().toISOString();

  return {
    id,
    displayName: displayName ?? null,
    username,
    bio: bio ?? null,
    avatar: avatar ?? null,
    counts,
    updatedAt,
  };
}

export function mapUserProfilePayload(value: unknown): { profile: ProfileWrite; posts: PostWrite[] } | null {
  if (!isRecord(value)) return null;

  const userRecord = isRecord(value.user) ? value.user : value;
  const profile = mapProfilePayload(userRecord);
  if (!profile) return null;

  const postsArray = Array.isArray(value.posts) ? value.posts : [];
  const posts: PostWrite[] = postsArray.flatMap((post) => {
    const mapped = mapPostPayload(post, profile.id);
    return mapped ? [mapped] : [];
  });

  return { profile, posts };
}

export function mapPostPayload(value: unknown, authorId?: string): PostWrite | null {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id) ?? stringValue(value._id);
  if (!id) return null;

  const resolvedAuthorId = authorId ?? stringValue(value.userId) ?? stringValue(value.author?.id) ?? stringValue(value.author?._id);
  if (!resolvedAuthorId) return null;

  const content = stringValue(value.caption) ?? stringValue(value.text) ?? stringValue(value.content) ?? "";
  const media = mapPostMediaArray(value.media);
  const createdAt = stringValue(value.createdAt) ?? new Date().toISOString();
  const updatedAt = stringValue(value.updatedAt) ?? createdAt;
  const deletedAt = stringValue(value.deletedAt);

  return {
    id,
    authorId: resolvedAuthorId,
    content,
    media,
    createdAt,
    updatedAt,
    deletedAt,
  };
}

export function mapPostsListPayload(value: unknown, authorId?: string): PostWrite[] {
  if (!isRecord(value)) return [];

  const dataRecord = isRecord(value.data) ? value.data : value;
  const postsArray = Array.isArray(dataRecord.posts) ? dataRecord.posts : [];

  return postsArray.flatMap((post) => {
    const mapped = mapPostPayload(post, authorId);
    return mapped ? [mapped] : [];
  });
}

export function mapSearchUsersPayload(value: unknown): UserPreview[] {
  if (!isRecord(value)) return [];

  const dataRecord = isRecord(value.data) ? value.data : value;
  const usersArray = Array.isArray(dataRecord.users)
    ? dataRecord.users
    : Array.isArray(dataRecord.data)
    ? dataRecord.data
    : Array.isArray(value)
    ? value
    : [];

  return usersArray.flatMap((user) => {
    const mapped = mapUserPreview(user);
    return mapped ? [mapped] : [];
  });
}

export function mapSuggestedUsersPayload(value: unknown): UserPreview[] {
  return mapSearchUsersPayload(value);
}

export function mapRecommendedPostsPayload(value: unknown, authorId?: string): PostWrite[] {
  return mapPostsListPayload(value, authorId);
}

export function mapTrendingPostsPayload(value: unknown, authorId?: string): PostWrite[] {
  return mapPostsListPayload(value, authorId);
}

/**
 * Maps an API post payload (search / trending / recommended responses) into the
 * UI `Post` shape, keeping author, tags, location and engagement counts that
 * the write-model mapper deliberately drops.
 */
export function mapApiPost(value: unknown): Post | null {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id) ?? stringValue(value._id);
  if (!id) return null;

  const authorValue = isRecord(value.author) ? value.author : null;
  const authorId = authorValue
    ? stringValue(authorValue.id) ?? stringValue(authorValue._id)
    : null;
  if (!authorId) return null;

  const author =
    mapUserPreview({ ...authorValue, id: authorId }) ?? {
      id: authorId,
      username: "",
      isVerified: false,
    };

  const collaborators = Array.isArray(value.collaborators)
    ? value.collaborators.flatMap((item) => {
        const mapped = mapUserPreview(item);
        return mapped ? [mapped] : [];
      })
    : [];

  const tags = Array.isArray(value.tags)
    ? value.tags.filter(
        (tag): tag is string => typeof tag === "string" && tag.length > 0,
      )
    : [];

  const media = mapPostMediaArray(value.media).map((item, index) => ({
    ...item,
    id: `${id}:${index}`,
  }));

  const location = stringValue(value.location);
  const caption = stringValue(value.caption);
  const createdAt = stringValue(value.createdAt) ?? new Date().toISOString();
  const deletedAt = stringValue(value.deletedAt);
  const remixOf = stringValue(value.remixOf);
  const remixSource = value.remixSource ? mapUserPreview(value.remixSource) : null;

  return {
    id,
    userId: authorId,
    author,
    collaborators: collaborators.length > 0 ? collaborators : undefined,
    remixOf: remixOf ?? undefined,
    remixSource,
    isRemix: booleanValue(value.isRemix) ?? false,
    caption: caption ?? undefined,
    media,
    tags,
    location: location ?? undefined,
    likesCount: numberValue(value.likesCount) ?? 0,
    commentsCount: numberValue(value.commentsCount) ?? 0,
    sharesCount: numberValue(value.sharesCount) ?? 0,
    isLiked: booleanValue(value.isLiked) ?? false,
    isSaved: booleanValue(value.isSaved) ?? false,
    createdAt,
    isDeleted: booleanValue(value.isDeleted) ?? false,
    deletedAt,
  };
}

export function mapApiPostsPayload(value: unknown): Post[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const mapped = mapApiPost(item);
      return mapped ? [mapped] : [];
    });
  }
  if (!isRecord(value)) return [];

  const dataRecord = isRecord(value.data) ? value.data : value;
  const postsArray = Array.isArray(dataRecord.posts)
    ? dataRecord.posts
    : Array.isArray(dataRecord.items)
      ? dataRecord.items
      : [];

  return postsArray.flatMap((item) => {
    const mapped = mapApiPost(item);
    return mapped ? [mapped] : [];
  });
}

export { mapUserPreview };
export type { UserPreview } from "../types";
export type { PostWrite } from "./posts";

export function extractSearchCacheKey(family: string, query: string, page: number, limit: number): string {
  const normalizedQuery = query.trim().toLowerCase();
  return `${family}:${normalizedQuery}:${page}:${limit}`;
}

export const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

export function isSearchCacheFresh(fetchedAt: string): boolean {
  const fetched = Date.parse(fetchedAt);
  return Number.isFinite(fetched) && Date.now() - fetched < SEARCH_CACHE_TTL_MS;
}