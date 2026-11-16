import { desc, eq } from "drizzle-orm";
import { getUserDatabase } from "../db/client";
import { posts, profiles, type ProfileCounts } from "../db/schema";
import { publishRepositoryChange, repositoryTopic } from "./changes";

export interface ProfileWrite {
  id: string;
  displayName: string | null;
  username: string;
  bio: string | null;
  avatar: string | null;
  counts: ProfileCounts;
  updatedAt: string;
}

export async function getProfile(userId: string, profileId: string) {
  const database = await getUserDatabase(userId);
  const [profile] = await database
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  return profile ?? null;
}

export async function upsertProfile(
  userId: string,
  profile: ProfileWrite,
): Promise<void> {
  const database = await getUserDatabase(userId);
  await database
    .insert(profiles)
    .values(profile)
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        displayName: profile.displayName,
        username: profile.username,
        bio: profile.bio,
        avatar: profile.avatar,
        counts: profile.counts,
        updatedAt: profile.updatedAt,
      },
    });
  publishRepositoryChange(repositoryTopic(userId, "profiles"));
}

export interface ProfileWithPosts {
  profile: ProfileWrite | null;
  postIds: string[];
}

export async function getProfileWithPosts(
  userId: string,
  profileId: string,
  postLimit = 12,
): Promise<ProfileWithPosts> {
  const database = await getUserDatabase(userId);
  const [profile] = await database
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  const postRows = await database
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.authorId, profileId))
    .orderBy(desc(posts.createdAt))
    .limit(postLimit);

  return {
    profile: profile ?? null,
    postIds: postRows.map((row) => row.id),
  };
}
