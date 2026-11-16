import { desc, eq, isNull } from "drizzle-orm";
import { getUserDatabase } from "../db/client";
import {
  conversations,
  messages,
  type ParticipantSnapshot,
} from "../db/schema";
import { publishRepositoryChange, repositoryTopic } from "./changes";

export interface ConversationWrite {
  id: string;
  title: string | null;
  participants: ParticipantSnapshot[];
  lastMessageId: string | null;
  unreadCount: number;
  updatedAt: string;
  deletedAt: string | null;
}

export async function listConversations(userId: string) {
  const database = await getUserDatabase(userId);
  return database
    .select()
    .from(conversations)
    .where(isNull(conversations.deletedAt))
    .orderBy(desc(conversations.updatedAt));
}

export async function listConversationSummaries(userId: string) {
  const database = await getUserDatabase(userId);
  return database
    .select({ conversation: conversations, lastMessage: messages })
    .from(conversations)
    .leftJoin(messages, eq(conversations.lastMessageId, messages.id))
    .where(isNull(conversations.deletedAt))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversation(userId: string, id: string) {
  const database = await getUserDatabase(userId);
  const [conversation] = await database
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  return conversation ?? null;
}

export async function markConversationReadLocally(
  userId: string,
  id: string,
): Promise<void> {
  const database = await getUserDatabase(userId);
  await database
    .update(conversations)
    .set({ unreadCount: 0 })
    .where(eq(conversations.id, id))
    .run();
  publishRepositoryChange(repositoryTopic(userId, "conversations"));
}

export async function incrementConversationUnreadLocally(
  userId: string,
  id: string,
): Promise<number> {
  const database = await getUserDatabase(userId);
  const [conversation] = await database
    .select({ unreadCount: conversations.unreadCount })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  if (!conversation) return 0;

  const unreadCount = conversation.unreadCount + 1;
  await database
    .update(conversations)
    .set({ unreadCount })
    .where(eq(conversations.id, id))
    .run();
  publishRepositoryChange(repositoryTopic(userId, "conversations"));
  return unreadCount;
}

export async function upsertConversations(
  userId: string,
  rows: ConversationWrite[],
): Promise<void> {
  if (rows.length === 0) return;
  const database = await getUserDatabase(userId);

  database.transaction((transaction) => {
    for (const row of rows) {
      transaction
        .insert(conversations)
        .values(row)
        .onConflictDoUpdate({
          target: conversations.id,
          set: {
            title: row.title,
            participants: row.participants,
            lastMessageId: row.lastMessageId,
            unreadCount: row.unreadCount,
            updatedAt: row.updatedAt,
            deletedAt: row.deletedAt,
          },
        })
        .run();
    }
  });

  publishRepositoryChange(repositoryTopic(userId, "conversations"));
}
