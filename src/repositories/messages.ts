import { and, desc, eq, inArray } from "drizzle-orm";
import { getUserDatabase, type LocalDatabase } from "../db/client";
import {
  messagePages,
  messages,
  outbox,
  type JsonValue,
  type MessageAttachment,
  type MessageMetadata,
  type MessageStatus,
  type MessageType,
} from "../db/schema";
import { publishRepositoryChange, repositoryTopic } from "./changes";

export interface MessageWrite {
  id: string;
  clientId: string | null;
  conversationId: string;
  senderId: string;
  body: string;
  attachments: MessageAttachment[];
  messageType: MessageType;
  status: MessageStatus;
  seq: number | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  metadata: MessageMetadata;
}

export type MessageTransaction = Parameters<
  Parameters<LocalDatabase["transaction"]>[0]
>[0];

export function upsertMessageRows(
  transaction: MessageTransaction,
  rows: MessageWrite[],
): void {
  for (const row of rows) {
    const existingByClientId = row.clientId
      ? transaction
          .select({ id: messages.id })
          .from(messages)
          .where(eq(messages.clientId, row.clientId))
          .limit(1)
          .get()
      : undefined;
    const previousId = existingByClientId?.id;

    if (previousId && previousId !== row.id) {
      transaction.delete(messages).where(eq(messages.id, previousId)).run();
    }

    transaction
      .insert(messages)
      .values(row)
      .onConflictDoUpdate({
        target: messages.id,
        set: {
          clientId: row.clientId,
          conversationId: row.conversationId,
          senderId: row.senderId,
          body: row.body,
          attachments: row.attachments,
          messageType: row.messageType,
          status: row.status,
          seq: row.seq,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          editedAt: row.editedAt,
          deletedAt: row.deletedAt,
          metadata: row.metadata,
        },
      })
      .run();
  }
}

async function hasUnsequencedMessages(
  database: LocalDatabase,
  conversationId: string,
): Promise<boolean> {
  const result = await database.$client.getFirstAsync<{
    hasUnsequenced: number;
  }>(
    `SELECT EXISTS(
       SELECT 1 FROM messages
       WHERE conversation_id = ? AND seq IS NULL
     ) AS hasUnsequenced`,
    [conversationId],
  );
  return result?.hasUnsequenced === 1;
}

export async function listRecentMessages(
  userId: string,
  conversationId: string,
  limit = 30,
) {
  const database = await getUserDatabase(userId);
  const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
  const query = database
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  const rows = (await hasUnsequencedMessages(database, conversationId))
    ? await query.orderBy(desc(messages.createdAt)).limit(safeLimit)
    : await query
        .orderBy(desc(messages.seq), desc(messages.createdAt))
        .limit(safeLimit);
  return rows.reverse();
}

export async function getMessageByClientId(userId: string, clientId: string) {
  const database = await getUserDatabase(userId);
  const [message] = await database
    .select()
    .from(messages)
    .where(eq(messages.clientId, clientId))
    .limit(1);
  return message ?? null;
}

export async function getMessageById(userId: string, id: string) {
  const database = await getUserDatabase(userId);
  const [message] = await database
    .select()
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1);
  return message ?? null;
}

export async function queueMessageLocally(
  userId: string,
  row: MessageWrite,
  payload: { [key: string]: JsonValue },
): Promise<void> {
  if (!row.clientId) throw new Error("A queued message requires a client ID");
  const clientId = row.clientId;
  const database = await getUserDatabase(userId);

  database.transaction((transaction) => {
    const [latest] = transaction
      .select({ createdAt: outbox.createdAt })
      .from(outbox)
      .orderBy(desc(outbox.createdAt))
      .limit(1)
      .all();
    const latestTime = latest ? Date.parse(latest.createdAt) : 0;
    const createdAt = new Date(Math.max(Date.now(), latestTime + 1)).toISOString();
    upsertMessageRows(transaction, [row]);
    transaction
      .insert(outbox)
      .values({
        id: clientId,
        type: "send_message",
        payload,
        attempts: 0,
        nextRetryAt: null,
        createdAt,
      })
      .onConflictDoUpdate({
        target: outbox.id,
        set: {
          type: "send_message",
          payload,
          attempts: 0,
          nextRetryAt: null,
          createdAt,
        },
      })
      .run();
  });

  publishRepositoryChange(repositoryTopic(userId, "messages"));
  publishRepositoryChange(repositoryTopic(userId, "search"));
}

export async function getMessagesByIds(userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const database = await getUserDatabase(userId);
  const rows = await database
    .select()
    .from(messages)
    .where(inArray(messages.id, ids));
  const rowById = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = rowById.get(id);
    return row ? [row] : [];
  });
}

export async function getStoredMessagePage(
  userId: string,
  conversationId: string,
  page: number,
) {
  const database = await getUserDatabase(userId);
  const storedPage = await database
    .select()
    .from(messagePages)
    .where(
      and(
        eq(messagePages.conversationId, conversationId),
        eq(messagePages.page, page),
      ),
    )
    .limit(1);
  const pageRow = storedPage[0];
  if (!pageRow) return null;

  return {
    messages: await getMessagesByIds(userId, pageRow.messageIds),
    hasMore: pageRow.hasMore,
    fetchedAt: pageRow.fetchedAt,
  };
}

export async function storeMessagePage(
  userId: string,
  conversationId: string,
  page: number,
  rows: MessageWrite[],
  hasMore: boolean,
): Promise<void> {
  const database = await getUserDatabase(userId);
  const pageRow = {
    conversationId,
    page,
    messageIds: rows.map((row) => row.id),
    hasMore,
    fetchedAt: new Date().toISOString(),
  };
  database.transaction((transaction) => {
    upsertMessageRows(transaction, rows);
    transaction
      .insert(messagePages)
      .values(pageRow)
      .onConflictDoUpdate({
        target: [messagePages.conversationId, messagePages.page],
        set: {
          messageIds: pageRow.messageIds,
          hasMore: pageRow.hasMore,
          fetchedAt: pageRow.fetchedAt,
        },
      })
      .run();
  });
  publishRepositoryChange(repositoryTopic(userId, "messages"));
  publishRepositoryChange(repositoryTopic(userId, "search"));
}

export async function upsertMessages(
  userId: string,
  rows: MessageWrite[],
): Promise<void> {
  if (rows.length === 0) return;
  const database = await getUserDatabase(userId);

  database.transaction((transaction) => {
    upsertMessageRows(transaction, rows);
  });

  publishRepositoryChange(repositoryTopic(userId, "messages"));
  publishRepositoryChange(repositoryTopic(userId, "search"));
}

export async function markMessagesDeleted(
  userId: string,
  ids: string[],
  deletedAt: string,
): Promise<void> {
  if (ids.length === 0) return;
  const database = await getUserDatabase(userId);
  await database
    .update(messages)
    .set({ deletedAt, body: "", attachments: [] })
    .where(inArray(messages.id, ids))
    .run();
  publishRepositoryChange(repositoryTopic(userId, "messages"));
  publishRepositoryChange(repositoryTopic(userId, "search"));
}

export async function applyMessageReadReceipt(
  userId: string,
  messageIds: string[],
  readerId: string,
  readAt: string,
): Promise<void> {
  if (messageIds.length === 0 || !readerId) return;
  const database = await getUserDatabase(userId);

  database.transaction((transaction) => {
    for (const id of messageIds) {
      const [message] = transaction
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1)
        .all();
      if (!message) continue;

      const readBy = message.metadata.readBy ?? [];
      const nextReadBy = readBy.some((entry) => entry.user === readerId)
        ? readBy
        : [...readBy, { user: readerId, readAt }];
      transaction
        .update(messages)
        .set({
          metadata: { ...message.metadata, readBy: nextReadBy },
          status:
            message.senderId === userId && readerId !== userId
              ? "read"
              : message.status,
        })
        .where(eq(messages.id, id))
        .run();
    }
  });

  publishRepositoryChange(repositoryTopic(userId, "messages"));
}

export async function setMessageStatusByClientId(
  userId: string,
  clientId: string,
  status: MessageStatus,
): Promise<void> {
  const database = await getUserDatabase(userId);
  await database
    .update(messages)
    .set({ status })
    .where(eq(messages.clientId, clientId))
    .run();
  publishRepositoryChange(repositoryTopic(userId, "messages"));
}

export async function listMessagesInOrder(
  userId: string,
  conversationId: string,
) {
  const database = await getUserDatabase(userId);
  const query = database
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  return (await hasUnsequencedMessages(database, conversationId))
    ? query.orderBy(messages.createdAt)
    : query.orderBy(messages.seq, messages.createdAt);
}

export const MAX_MESSAGES_PER_CONVERSATION = 500;

export async function getOutboxReferencedMessageIds(userId: string): Promise<Set<string>> {
  const database = await getUserDatabase(userId);
  const items = await database.select({ payload: outbox.payload }).from(outbox);
  const ids = new Set<string>();
  for (const item of items) {
    const payload = item.payload as Record<string, unknown>;
    if (payload.clientId && typeof payload.clientId === "string") {
      const message = await database
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.clientId, payload.clientId))
        .limit(1)
        .get();
      if (message) ids.add(message.id);
    }
    if (payload.messageId && typeof payload.messageId === "string") {
      ids.add(payload.messageId);
    }
  }
  return ids;
}

export async function cleanupConversationMessages(
  userId: string,
  conversationId: string,
): Promise<number> {
  const database = await getUserDatabase(userId);
  const outboxRefs = await getOutboxReferencedMessageIds(userId);

  const allMessages = await database
    .select({
      id: messages.id,
      status: messages.status,
      clientId: messages.clientId,
      seq: messages.seq,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));

  const protectedIds = new Set<string>();
  for (const msg of allMessages) {
    if (msg.status === "pending" || msg.status === "failed") {
      protectedIds.add(msg.id);
    }
    if (msg.clientId && outboxRefs.has(msg.id)) {
      protectedIds.add(msg.id);
    }
  }

  const sortedMessages = [...allMessages].sort((a, b) => {
    const aSeq = a.seq ?? -1;
    const bSeq = b.seq ?? -1;
    if (aSeq !== -1 && bSeq !== -1) return bSeq - aSeq;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const deletable = sortedMessages
    .filter((msg) => !protectedIds.has(msg.id))
    .slice(MAX_MESSAGES_PER_CONVERSATION);

  if (deletable.length === 0) return 0;

  const deleteIds = deletable.map((m) => m.id);
  await database.delete(messages).where(inArray(messages.id, deleteIds)).run();

  await database
    .delete(messagePages)
    .where(eq(messagePages.conversationId, conversationId))
    .run();

  publishRepositoryChange(repositoryTopic(userId, "messages"));
  publishRepositoryChange(repositoryTopic(userId, "search"));

  return deleteIds.length;
}

export async function cleanupAllConversations(userId: string): Promise<number> {
  const database = await getUserDatabase(userId);
  const conversations = await database
    .select({ id: messages.conversationId })
    .from(messages)
    .groupBy(messages.conversationId);

  let totalDeleted = 0;
  for (const conv of conversations) {
    totalDeleted += await cleanupConversationMessages(userId, conv.id);
  }
  return totalDeleted;
}
