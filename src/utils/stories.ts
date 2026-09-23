import type { Story, StoryGroup } from "../types";

// The backend returns raw Mongoose story docs grouped by author
// (`{ stories: [{ user, stories: [...], hasUnwatched }] }`), not the
// mobile-shaped `StoryGroup`/`Story` types — this normalizes one into
// the other so every screen that reads stories agrees on field names.
function normalizeStory(raw: any): Story {
  return {
    id: raw._id || raw.id,
    userId: raw.author?._id || raw.author?.id || raw.userId,
    mediaUrl: raw.media?.url || raw.mediaUrl,
    type: raw.media?.type || raw.type || "image",
    caption: raw.text || raw.caption,
    viewsCount: raw.viewers?.length ?? raw.viewsCount ?? 0,
    reactions: (raw.reactions || []).map((r: any) => ({
      userId: r.user?._id || r.user?.id || r.userId,
      emoji: r.emoji,
    })),
    createdAt: raw.createdAt,
  };
}

export function normalizeStoryGroups(raw: any): StoryGroup[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((g: any) => ({
    userId: g.user?._id || g.user?.id || g.userId,
    user: {
      id: g.user?._id || g.user?.id,
      username: g.user?.username,
      avatarUrl: g.user?.avatarUrl,
      isVerified: g.user?.isVerified,
    },
    stories: (g.stories || []).map(normalizeStory),
    hasUnviewed: g.hasUnwatched ?? g.hasUnviewed ?? false,
  }));
}

export function extractStoryGroupsPayload(data: any): any[] {
  return data?.stories || data?.data || data?.storyGroups || data?.groups || (Array.isArray(data) ? data : []);
}
