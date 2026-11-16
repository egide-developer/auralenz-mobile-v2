import {
  applyMessageReadReceipt,
  getMessageById,
  markMessagesDeleted,
  storeMessagePage,
  upsertMessages,
} from "../repositories/messages";
import {
  mapMessagePagePayload,
  mapMessagePayload,
  mergeMessagePayload,
} from "../repositories/chatMappers";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifier(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (!isRecord(value)) return null;
  if (typeof value.id === "string") return value.id;
  return typeof value._id === "string" ? value._id : null;
}

function messageEvent(value: unknown): {
  conversationId: string | null;
  message: unknown;
} {
  if (!isRecord(value)) return { conversationId: null, message: null };
  return {
    conversationId:
      identifier(value.conversationId) ??
      identifier(value.conversation) ??
      null,
    message: value.message ?? value,
  };
}

export async function applyNewMessageEvent(
  userId: string,
  value: unknown,
) {
  const event = messageEvent(value);
  const mapped = mapMessagePayload(
    event.message,
    event.conversationId ?? undefined,
  );
  if (!mapped) return null;
  await upsertMessages(userId, [mapped]);
  return mapped;
}

export async function applyMessageUpdatedEvent(
  userId: string,
  value: unknown,
): Promise<void> {
  const event = messageEvent(value);
  const raw = isRecord(event.message) ? event.message : {};
  const id = identifier(raw);
  const existing = id ? await getMessageById(userId, id) : null;
  const mapped = existing
    ? mergeMessagePayload(existing, raw)
    : mapMessagePayload(event.message, event.conversationId ?? undefined);
  if (!mapped) {
    console.error("[ChatSync] Ignored an invalid message_updated payload");
    return;
  }
  await upsertMessages(userId, [mapped]);
}

export async function applyMessageDeletedEvent(
  userId: string,
  value: unknown,
): Promise<void> {
  if (!isRecord(value)) {
    console.error("[ChatSync] Ignored an invalid message_deleted payload");
    return;
  }
  const message = isRecord(value.message) ? value.message : value;
  const id =
    identifier(message) ??
    identifier(value.messageId) ??
    identifier(value.id);
  if (!id) {
    console.error("[ChatSync] Ignored a message_deleted event without an ID");
    return;
  }
  const deletedAt =
    typeof message.deletedAt === "string"
      ? message.deletedAt
      : new Date().toISOString();
  await markMessagesDeleted(userId, [id], deletedAt);
}

export async function applyMessagesReadEvent(
  userId: string,
  value: unknown,
): Promise<void> {
  if (!isRecord(value)) {
    console.error("[ChatSync] Ignored an invalid messages_read payload");
    return;
  }
  const ids = Array.isArray(value.messageIds)
    ? value.messageIds.flatMap((id) => (typeof id === "string" ? [id] : []))
    : [];
  const readerId = identifier(value.readBy) ?? identifier(value.userId);
  if (ids.length === 0 || !readerId) {
    console.error("[ChatSync] Ignored an incomplete messages_read payload");
    return;
  }
  const readAt =
    typeof value.readAt === "string" ? value.readAt : new Date().toISOString();
  await applyMessageReadReceipt(userId, ids, readerId, readAt);
}

export async function applyMessagePageDelta(
  userId: string,
  conversationId: string,
  response: unknown,
): Promise<{ count: number; hasMore: boolean }> {
  const page = mapMessagePagePayload(response, conversationId);
  await storeMessagePage(
    userId,
    conversationId,
    1,
    page.messages,
    page.hasMore,
  );
  return { count: page.messages.length, hasMore: page.hasMore };
}
