import { asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getUserDatabase, type LocalDatabase } from "../db/client";
import { messages, outbox, type JsonValue, type OutboxType } from "../db/schema";
import {
  upsertMessageRows,
  type MessageWrite,
} from "./messages";
import { publishRepositoryChange, repositoryTopic } from "./changes";

export type OutboxItem = typeof outbox.$inferSelect;
type OutboxTransaction = Parameters<
  Parameters<LocalDatabase["transaction"]>[0]
>[0];

function nextOutboxCreatedAt(transaction: OutboxTransaction): string {
  const [latest] = transaction
    .select({ createdAt: outbox.createdAt })
    .from(outbox)
    .orderBy(desc(outbox.createdAt))
    .limit(1)
    .all();
  const latestTime = latest ? Date.parse(latest.createdAt) : 0;
  return new Date(Math.max(Date.now(), latestTime + 1)).toISOString();
}

export async function listOutboxItems(userId: string): Promise<OutboxItem[]> {
  const database = await getUserDatabase(userId);
  return database.select().from(outbox).orderBy(asc(outbox.createdAt));
}

export async function getNextOutboxRetryAt(
  userId: string,
): Promise<string | null> {
  const database = await getUserDatabase(userId);
  const items = await database
    .select({ nextRetryAt: outbox.nextRetryAt })
    .from(outbox)
    .where(isNotNull(outbox.nextRetryAt))
    .orderBy(asc(outbox.nextRetryAt))
    .limit(1);
  return items[0]?.nextRetryAt ?? null;
}

export async function enqueueOutboxItem(
  userId: string,
  item: {
    id: string;
    type: OutboxType;
    payload: { [key: string]: JsonValue };
  },
): Promise<void> {
  const database = await getUserDatabase(userId);
  database.transaction((transaction) => {
    const createdAt = nextOutboxCreatedAt(transaction);
    transaction
      .insert(outbox)
      .values({
        ...item,
        attempts: 0,
        nextRetryAt: null,
        createdAt,
      })
      .onConflictDoUpdate({
        target: outbox.id,
        set: {
        type: item.type,
        payload: item.payload,
        attempts: 0,
        nextRetryAt: null,
        createdAt,
        },
      })
      .run();
  });
}

export async function completeOutboxItem(
  userId: string,
  itemId: string,
): Promise<void> {
  const database = await getUserDatabase(userId);
  await database.delete(outbox).where(eq(outbox.id, itemId)).run();
}

export async function completeMessageSend(
  userId: string,
  clientId: string,
  serverMessage: MessageWrite,
): Promise<void> {
  const database = await getUserDatabase(userId);
  database.transaction((transaction) => {
    upsertMessageRows(transaction, [serverMessage]);
    transaction.delete(outbox).where(eq(outbox.id, clientId)).run();
  });
  publishRepositoryChange(repositoryTopic(userId, "messages"));
  publishRepositoryChange(repositoryTopic(userId, "search"));
}

export async function recordOutboxFailure(
  userId: string,
  itemId: string,
  nextRetryAt: string | null,
  maximumAttempts: number,
): Promise<{ attempts: number; failed: boolean }> {
  const database = await getUserDatabase(userId);
  const [item] = await database
    .select()
    .from(outbox)
    .where(eq(outbox.id, itemId))
    .limit(1);
  if (!item) return { attempts: 0, failed: false };

  const attempts = item.attempts + 1;
  const failed = nextRetryAt === null || attempts >= maximumAttempts;
  database.transaction((transaction) => {
    if (failed) {
      if (item.type === "send_message") {
        transaction
          .update(messages)
          .set({ status: "failed" })
          .where(eq(messages.clientId, item.id))
          .run();
      }
      transaction.delete(outbox).where(eq(outbox.id, itemId)).run();
      return;
    }

    transaction
      .update(outbox)
      .set({ attempts, nextRetryAt })
      .where(eq(outbox.id, itemId))
      .run();
  });

  if (failed && item.type === "send_message") {
    publishRepositoryChange(repositoryTopic(userId, "messages"));
  }
  return { attempts, failed };
}

export interface AttachmentReference {
  uri: string;
  type: "outbox" | "message";
}

export async function getReferencedAttachmentUris(userId: string): Promise<Set<string>> {
  const database = await getUserDatabase(userId);
  const uris = new Set<string>();

  const outboxItems = await database.select({ payload: outbox.payload }).from(outbox);
  for (const item of outboxItems) {
    const payload = item.payload as Record<string, unknown>;
    if (Array.isArray(payload.attachments)) {
      for (const att of payload.attachments) {
        if (att && typeof att === "object" && typeof att.uri === "string") {
          uris.add(att.uri);
        }
      }
    }
  }

  const messageRows = await database
    .select({ attachments: messages.attachments })
    .from(messages);
  for (const row of messageRows) {
    if (Array.isArray(row.attachments)) {
      for (const att of row.attachments) {
        if (att && typeof att === "object" && typeof att.url === "string") {
          uris.add(att.url);
        }
      }
    }
  }

  return uris;
}

export async function cleanupOrphanedOutboxAttachments(userId: string): Promise<number> {
  const { Directory, Paths } = await import("expo-file-system");
  const directory = new Directory(Paths.document, "message-outbox", encodeURIComponent(userId));
  if (!directory.exists) return 0;

  const referenced = await getReferencedAttachmentUris(userId);
  let deleted = 0;

  try {
    const files = await directory.list({ recursive: false });
    for (const file of files) {
      if (!referenced.has(file.uri)) {
        try {
          const fileObj = new (await import("expo-file-system")).File(file.uri);
          if (fileObj.exists) {
            fileObj.delete();
            deleted++;
          }
        } catch {}
      }
    }
  } catch {}

  return deleted;
}

