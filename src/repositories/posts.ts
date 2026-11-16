import { and, desc, eq, isNull } from "drizzle-orm";
import { getUserDatabase, type LocalDatabase } from "../db/client";
import { posts, type PostMedia, type PostStatus } from "../db/schema";
import { publishRepositoryChange, repositoryTopic } from "./changes";

export interface PostWrite {
  id: string;
  authorId: string;
  content: string;
  media: PostMedia[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  clientId?: string | null;
  status?: PostStatus;
  previousContent?: string | null;
  previousMedia?: string | null;
}

export type PostTransaction = Parameters<Parameters<LocalDatabase["transaction"]>[0]>[0];

export function upsertPostRows(
  transaction: PostTransaction,
  rows: PostWrite[],
): void {
  for (const row of rows) {
    const existingByClientId = row.clientId
      ? transaction
          .select({ id: posts.id })
          .from(posts)
          .where(eq(posts.clientId, row.clientId))
          .limit(1)
          .get()
      : undefined;
    const previousId = existingByClientId?.id;

    if (previousId && previousId !== row.id) {
      transaction.delete(posts).where(eq(posts.id, previousId)).run();
    }

    transaction
      .insert(posts)
      .values(row)
      .onConflictDoUpdate({
        target: posts.id,
        set: {
          authorId: row.authorId,
          content: row.content,
          media: row.media,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deletedAt: row.deletedAt,
          clientId: row.clientId,
          status: row.status,
          previousContent: row.previousContent,
          previousMedia: row.previousMedia,
        },
      })
      .run();
  }
}

export async function listPostsByAuthor(
  userId: string,
  authorId: string,
  limit = 12,
) {
  const database = await getUserDatabase(userId);
  return database
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, authorId), isNull(posts.deletedAt)))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}

export async function listPostsByAuthorIncludingPending(
  userId: string,
  authorId: string,
  limit = 12,
) {
  const database = await getUserDatabase(userId);
  return database
    .select()
    .from(posts)
    .where(eq(posts.authorId, authorId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}

export async function upsertPosts(
  userId: string,
  rows: PostWrite[],
): Promise<void> {
  if (rows.length === 0) return;
  const database = await getUserDatabase(userId);

  await database.transaction(async (transaction) => {
    upsertPostRows(transaction, rows);
  });

  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function getPostByClientId(userId: string, clientId: string) {
  const database = await getUserDatabase(userId);
  const [post] = await database
    .select()
    .from(posts)
    .where(eq(posts.clientId, clientId))
    .limit(1);
  return post ?? null;
}

export async function getPostById(userId: string, id: string) {
  const database = await getUserDatabase(userId);
  const [post] = await database
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return post ?? null;
}

export async function createPostOptimistic(
  userId: string,
  row: PostWrite,
  outboxPayload: { [key: string]: unknown },
): Promise<void> {
  if (!row.clientId) throw new Error("Optimistic post create requires a clientId");
  const database = await getUserDatabase(userId);

  database.transaction((transaction) => {
    const [latest] = transaction
      .select({ createdAt: posts.createdAt })
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(1)
      .all();
    const latestTime = latest ? Date.parse(latest.createdAt) : 0;
    const createdAt = new Date(Math.max(Date.now(), latestTime + 1)).toISOString();

    upsertPostRows(transaction, [{ ...row, createdAt, updatedAt: createdAt }]);
  });

  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function updatePostOptimistic(
  userId: string,
  postId: string,
  updates: Partial<PostWrite>,
  outboxPayload: { [key: string]: unknown },
): Promise<void> {
  const database = await getUserDatabase(userId);
  const [existing] = await database
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existing) throw new Error("Post not found for optimistic update");

  const previousContent = existing.content;
  const previousMedia = JSON.stringify(existing.media);

  database.transaction((transaction) => {
    transaction
      .update(posts)
      .set({
        ...updates,
        previousContent,
        previousMedia,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, postId))
      .run();
  });

  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function deletePostOptimistic(
  userId: string,
  postId: string,
  outboxPayload: { [key: string]: unknown },
): Promise<void> {
  const database = await getUserDatabase(userId);
  const [existing] = await database
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existing) throw new Error("Post not found for optimistic delete");

  const previousContent = existing.content;
  const previousMedia = JSON.stringify(existing.media);

  database.transaction((transaction) => {
    transaction
      .update(posts)
      .set({
        deletedAt: new Date().toISOString(),
        previousContent,
        previousMedia,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, postId))
      .run();
  });

  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function reconcilePostCreate(
  userId: string,
  clientId: string,
  serverPost: PostWrite,
): Promise<void> {
  const database = await getUserDatabase(userId);
  database.transaction((transaction) => {
    upsertPostRows(transaction, [serverPost]);
  });
  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function reconcilePostUpdate(
  userId: string,
  postId: string,
  serverPost: PostWrite,
): Promise<void> {
  const database = await getUserDatabase(userId);
  database.transaction((transaction) => {
    upsertPostRows(transaction, [serverPost]);
  });
  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function reconcilePostDelete(
  userId: string,
  postId: string,
): Promise<void> {
  const database = await getUserDatabase(userId);
  await database.delete(posts).where(eq(posts.id, postId)).run();
  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function rollbackPostCreate(
  userId: string,
  clientId: string,
): Promise<void> {
  const database = await getUserDatabase(userId);
  await database.delete(posts).where(eq(posts.clientId, clientId)).run();
  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function rollbackPostUpdate(
  userId: string,
  postId: string,
): Promise<void> {
  const database = await getUserDatabase(userId);
  const [post] = await database
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) return;

  database.transaction((transaction) => {
    if (post.previousContent !== null && post.previousMedia !== null) {
      transaction
        .update(posts)
        .set({
          content: post.previousContent,
          media: JSON.parse(post.previousMedia),
          previousContent: null,
          previousMedia: null,
          status: "sent",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(posts.id, postId))
        .run();
    }
  });
  publishRepositoryChange(repositoryTopic(userId, "posts"));
}

export async function rollbackPostDelete(
  userId: string,
  postId: string,
): Promise<void> {
  const database = await getUserDatabase(userId);
  const [post] = await database
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) return;

  database.transaction((transaction) => {
    if (post.previousContent !== null && post.previousMedia !== null) {
      transaction
        .update(posts)
        .set({
          deletedAt: null,
          content: post.previousContent,
          media: JSON.parse(post.previousMedia),
          previousContent: null,
          previousMedia: null,
          status: "sent",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(posts.id, postId))
        .run();
    }
  });
  publishRepositoryChange(repositoryTopic(userId, "posts"));
}
