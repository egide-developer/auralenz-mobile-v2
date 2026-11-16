import type {
  Conversation as UiConversation,
  Message as UiMessage,
  MessageFile,
  MessageReadEntry as UiMessageReadEntry,
  UserPreview,
} from "../types";
import type { conversations, messages } from "../db/schema";
import type { ConversationWrite } from "./conversations";
import type { MessageWrite } from "./messages";
import type {
  MessageAttachment,
  MessageEdit,
  MessageLinkPreview,
  MessageMetadata,
  MessageReaction,
  MessageReplyPreview,
  MessageStatus,
  MessageType,
  ParticipantSnapshot,
} from "../db/schema";

type RecordValue = Record<string, unknown>;
type LocalConversationRow = typeof conversations.$inferSelect;
type LocalMessageRow = typeof messages.$inferSelect;

export interface MappedConversation {
  conversation: ConversationWrite;
  user: UserPreview | null;
  preview: MessageWrite | null;
}

export interface MessagePagePayload {
  messages: MessageWrite[];
  hasMore: boolean;
  cursor?: string | null;
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function identifier(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (!isRecord(value)) return undefined;
  return stringValue(value.id) ?? stringValue(value._id);
}

function dateValue(value: unknown, fallback: string): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  return stringValue(value) ?? fallback;
}

function numericValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function mapParticipant(value: unknown): ParticipantSnapshot | null {
  const record = isRecord(value) ? value : null;
  const id = identifier(value);
  if (!id) return null;

  const username = stringValue(record?.username);
  const displayName = stringValue(record?.displayName) ?? stringValue(record?.name);
  const avatarUrl =
    stringValue(record?.avatarUrl) ?? stringValue(record?.avatar);
  const isVerified =
    typeof record?.isVerified === "boolean" ? record.isVerified : undefined;

  return {
    id,
    ...(username ? { username } : {}),
    ...(displayName ? { displayName } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(isVerified !== undefined ? { isVerified } : {}),
  };
}

function mapUserPreview(value: unknown): UserPreview | null {
  const participant = mapParticipant(value);
  if (!participant) return null;
  return {
    id: participant.id,
    username: participant.username ?? "",
    displayName: participant.displayName,
    avatarUrl: participant.avatarUrl,
    isVerified: participant.isVerified ?? false,
  };
}

function mapAttachment(
  value: unknown,
  fallbackType: MessageAttachment["type"],
): MessageAttachment | null {
  if (typeof value === "string") {
    return value.length > 0 ? { url: value, type: fallbackType } : null;
  }
  if (!isRecord(value)) return null;

  const url =
    stringValue(value.url) ??
    stringValue(value.uri) ??
    stringValue(value.fileUrl);
  if (!url) return null;

  const typeValue = stringValue(value.type);
  const type =
    typeValue === "image" || typeValue === "audio" || typeValue === "file"
      ? typeValue
      : fallbackType;
  const mimeType = stringValue(value.mimeType);
  const originalName =
    stringValue(value.originalName) ?? stringValue(value.name);
  const size = numericValue(value.size, -1);
  const duration = numericValue(value.duration, -1);
  return {
    url,
    type,
    ...(mimeType ? { mimeType } : {}),
    ...(originalName ? { originalName } : {}),
    ...(size >= 0 ? { size } : {}),
    ...(duration >= 0 ? { duration } : {}),
  };
}

function mapAttachments(record: RecordValue): MessageAttachment[] {
  const attachments: MessageAttachment[] = [];
  const add = (value: unknown, type: MessageAttachment["type"]) => {
    const mapped = mapAttachment(value, type);
    if (
      mapped &&
      !attachments.some(
        (attachment) =>
          attachment.url === mapped.url && attachment.type === mapped.type,
      )
    ) {
      attachments.push(mapped);
    }
  };

  if (Array.isArray(record.attachments)) {
    for (const attachment of record.attachments) {
      add(attachment, "file");
    }
  }
  if (Array.isArray(record.images)) {
    for (const image of record.images) add(image, "image");
  }
  if (Array.isArray(record.files)) {
    for (const file of record.files) add(file, "file");
  }
  if (record.audioUrl) add(record.audioUrl, "audio");
  return attachments;
}

function mapReadBy(value: unknown): UiMessageReadEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const user = identifier(entry.user) ?? identifier(entry.userId);
    if (!user) return [];
    return [
      {
        user,
        readAt: stringValue(entry.readAt) ?? stringValue(entry.createdAt) ?? "",
      },
    ];
  });
}

function mapReactions(value: unknown): MessageReaction[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const emoji = stringValue(entry.emoji);
    if (!emoji) return [];
    const users = Array.isArray(entry.users)
      ? entry.users.flatMap((user) => {
          const userId = identifier(user);
          return userId ? [userId] : [];
        })
      : [];
    return [
      {
        emoji,
        users,
        ...(typeof entry.count === "number" ? { count: entry.count } : {}),
      },
    ];
  });
}

function mapReplyTo(value: unknown): MessageReplyPreview | null {
  if (!isRecord(value)) return null;
  const id = identifier(value);
  const sender = mapParticipant(value.sender);
  return {
    ...(id ? { id } : {}),
    ...(stringValue(value.text) ? { text: stringValue(value.text) } : {}),
    ...(typeof value.isDeleted === "boolean"
      ? { isDeleted: value.isDeleted }
      : {}),
    ...(sender?.username ? { sender: { username: sender.username } } : {}),
  };
}

function mapEditHistory(value: unknown): MessageEdit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const text = typeof entry.text === "string" ? entry.text : null;
    const editedAt = stringValue(entry.editedAt);
    return text !== null && editedAt ? [{ text, editedAt }] : [];
  });
}

function mapLinkPreview(value: unknown): MessageLinkPreview | null {
  if (!isRecord(value)) return null;
  const url = stringValue(value.url);
  if (!url) return null;
  return {
    url,
    ...(stringValue(value.title) ? { title: stringValue(value.title) } : {}),
    ...(stringValue(value.description)
      ? { description: stringValue(value.description) }
      : {}),
    ...(stringValue(value.imageUrl)
      ? { imageUrl: stringValue(value.imageUrl) }
      : {}),
    ...(stringValue(value.siteName)
      ? { siteName: stringValue(value.siteName) }
      : {}),
  };
}

function mapMetadata(record: RecordValue): MessageMetadata {
  const sender = mapParticipant(record.sender);
  const audioDuration =
    typeof record.audioDuration === "number" ? record.audioDuration : null;
  const viewOnceConsumedAt =
    typeof record.viewOnceConsumedAt === "string"
      ? record.viewOnceConsumedAt
      : null;
  return {
    sender,
    audioDuration,
    reactions: mapReactions(record.reactions),
    readBy: mapReadBy(record.readBy),
    editHistory: mapEditHistory(record.editHistory),
    replyTo: mapReplyTo(record.replyTo),
    linkPreview: mapLinkPreview(record.linkPreview),
    viewOnce: booleanValue(record.viewOnce),
    viewOnceOpened: booleanValue(record.viewOnceOpened),
    viewOnceConsumedAt,
  };
}

function mapMessageType(value: unknown, attachments: MessageAttachment[]): MessageType {
  if (value === "text" || value === "image" || value === "audio" || value === "file") {
    return value;
  }
  return attachments[0]?.type ?? "text";
}

function mapStatus(record: RecordValue): MessageStatus {
  const status = record.status;
  if (
    status === "pending" ||
    status === "sent" ||
    status === "delivered" ||
    status === "read" ||
    status === "failed"
  ) {
    return status;
  }
  if (status === "sending" || record.pending === true) return "pending";
  if (record.failed === true) return "failed";
  return "sent";
}

export function mapMessagePayload(
  value: unknown,
  fallbackConversationId?: string,
): MessageWrite | null {
  if (!isRecord(value)) return null;
  const id = identifier(value);
  const conversationId =
    identifier(value.conversationId) ??
    identifier(value.conversation) ??
    fallbackConversationId;
  const senderId = identifier(value.senderId) ?? identifier(value.sender);
  if (!id || !conversationId || !senderId) return null;

  const now = new Date().toISOString();
  const createdAt = dateValue(value.createdAt, now);
  const updatedAt = dateValue(value.updatedAt, createdAt);
  const deletedAt =
    typeof value.deletedAt === "string"
      ? value.deletedAt
      : booleanValue(value.isDeleted)
        ? updatedAt
        : null;
  const attachments = mapAttachments(value);

  return {
    id,
    clientId:
      stringValue(value.clientId) ?? stringValue(value.client_id) ?? null,
    conversationId,
    senderId,
    body:
      typeof value.text === "string"
        ? value.text
        : typeof value.body === "string"
          ? value.body
          : "",
    attachments,
    messageType: mapMessageType(value.messageType, attachments),
    status: mapStatus(value),
    seq:
      typeof value.seq === "number" && Number.isInteger(value.seq)
        ? value.seq
        : null,
    createdAt,
    updatedAt,
    editedAt: stringValue(value.editedAt) ?? null,
    deletedAt,
    metadata: mapMetadata(value),
  };
}

export function mergeMessagePayload(
  existing: MessageWrite,
  patch: unknown,
): MessageWrite | null {
  const record = isRecord(patch) ? patch : {};
  const base = {
    id: existing.id,
    clientId: existing.clientId,
    conversationId: existing.conversationId,
    senderId: existing.senderId,
    text: existing.body,
    attachments: existing.attachments,
    messageType: existing.messageType,
    status: existing.status,
    seq: existing.seq,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
    editedAt: existing.editedAt,
    deletedAt: existing.deletedAt,
    sender: existing.metadata.sender,
    audioDuration: existing.metadata.audioDuration,
    reactions: existing.metadata.reactions,
    readBy: existing.metadata.readBy,
    editHistory: existing.metadata.editHistory,
    replyTo: existing.metadata.replyTo,
    linkPreview: existing.metadata.linkPreview,
    viewOnce: existing.metadata.viewOnce,
    viewOnceOpened: existing.metadata.viewOnceOpened,
    viewOnceConsumedAt: existing.metadata.viewOnceConsumedAt,
  };
  return mapMessagePayload(
    {
      ...base,
      ...record,
      id: identifier(record) ?? existing.id,
      conversationId:
        identifier(record.conversationId) ??
        identifier(record.conversation) ??
        existing.conversationId,
      senderId:
        identifier(record.senderId) ??
        identifier(record.sender) ??
        existing.senderId,
    },
    existing.conversationId,
  );
}

export function extractMessagePayloads(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data.messages)) return data.messages;
  if (isRecord(data) && Array.isArray(data.data)) return data.data;
  if (isRecord(data) && isRecord(data.data) && Array.isArray(data.data.messages)) {
    return data.data.messages;
  }
  if (Array.isArray(response.messages)) return response.messages;
  return [];
}

export function mapMessagePagePayload(
  response: unknown,
  conversationId: string,
): MessagePagePayload {
  const record = isRecord(response) ? response : {};
  const dataRecord = isRecord(record.data) ? record.data : {};
  const pagination = isRecord(record.pagination)
    ? record.pagination
    : isRecord(dataRecord.pagination)
      ? dataRecord.pagination
      : {};
  return {
    messages: extractMessagePayloads(response).flatMap((payload) => {
      const message = mapMessagePayload(payload, conversationId);
      return message ? [message] : [];
    }),
    hasMore: booleanValue(pagination.hasMore),
    cursor: pagination.cursor ?? null,
  };
}

export function mapConversationPayload(
  value: unknown,
  currentUserId?: string,
): MappedConversation | null {
  if (!isRecord(value)) return null;
  const id = identifier(value);
  if (!id) return null;

  const explicitUser = mapParticipant(value.user);
  const participantValues = Array.isArray(value.participants)
    ? value.participants
    : [];
  const participants = participantValues.flatMap((participant) => {
    const mapped = mapParticipant(participant);
    return mapped ? [mapped] : [];
  });
  const user =
    explicitUser ??
    participants.find((participant) => participant.id !== currentUserId) ??
    participants[0] ??
    null;
  const storedParticipants = user ? [user] : participants;
  const lastMessage = isRecord(value.lastMessage) ? value.lastMessage : null;
  const lastMessageId =
    (lastMessage &&
      (identifier(lastMessage.messageId) ?? identifier(lastMessage))) ??
    stringValue(value.lastMessageId) ??
    null;
  const timestamp = lastMessage
    ? dateValue(lastMessage.timestamp ?? lastMessage.createdAt, new Date().toISOString())
    : dateValue(value.updatedAt, new Date().toISOString());
  const preview =
    lastMessage && lastMessageId
      ? mapMessagePayload(
          {
            ...lastMessage,
            id: lastMessageId,
            senderId: lastMessage.senderId,
            text: lastMessage.text,
            messageType: lastMessage.messageType,
            createdAt: timestamp,
            isDeleted: lastMessage.isDeleted,
          },
          id,
        )
      : null;

  return {
    conversation: {
      id,
      title: stringValue(value.title) ?? null,
      participants: storedParticipants,
      lastMessageId,
      unreadCount: Math.max(0, Math.floor(numericValue(value.unreadCount))),
      updatedAt: dateValue(value.updatedAt, timestamp),
      deletedAt:
        typeof value.deletedAt === "string" ? value.deletedAt : null,
    },
    user: user
      ? {
          id: user.id,
          username: user.username ?? "",
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isVerified: user.isVerified ?? false,
        }
      : null,
    preview,
  };
}

export function extractConversationPayloads(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data.conversations)) {
    return data.conversations;
  }
  if (isRecord(data) && Array.isArray(data.data)) return data.data;
  if (
    isRecord(data) &&
    isRecord(data.data) &&
    Array.isArray(data.data.conversations)
  ) {
    return data.data.conversations;
  }
  if (Array.isArray(response.conversations)) return response.conversations;
  return [];
}

export function mapLocalMessageToUi(row: LocalMessageRow): UiMessage {
  const sender = row.metadata.sender;
  const images = row.attachments
    .filter((attachment) => attachment.type === "image")
    .map((attachment) => attachment.url);
  const audio = row.attachments.find((attachment) => attachment.type === "audio");
  const files: MessageFile[] = row.attachments
    .filter((attachment) => attachment.type === "file")
    .map((attachment) => ({
      url: attachment.url,
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
      size: attachment.size,
    }));

  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    sender: {
      id: sender?.id ?? row.senderId,
      username: sender?.username ?? "",
      displayName: sender?.displayName,
      avatarUrl: sender?.avatarUrl,
      isVerified: sender?.isVerified ?? false,
    },
    text: row.deletedAt ? "" : row.body,
    images,
    audioUrl: audio?.url ?? null,
    audioDuration: row.metadata.audioDuration ?? audio?.duration ?? null,
    files,
    messageType: row.messageType,
    status: row.status,
    reactions: row.metadata.reactions ?? [],
    readBy: row.metadata.readBy ?? [],
    isDeleted: row.deletedAt !== null,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    editHistory: row.metadata.editHistory ?? [],
    replyTo: row.metadata.replyTo,
    linkPreview: row.metadata.linkPreview,
    viewOnce: row.metadata.viewOnce,
    viewOnceOpened: row.metadata.viewOnceOpened,
    viewOnceConsumedAt: row.metadata.viewOnceConsumedAt,
    clientId: row.clientId ?? undefined,
    pending: row.status === "pending",
    failed: row.status === "failed",
  };
}

export function mapLocalConversationToUi(
  conversation: LocalConversationRow,
  lastMessage: LocalMessageRow | null,
): UiConversation {
  const participant = conversation.participants[0];
  return {
    id: conversation.id,
    user: participant
      ? {
          id: participant.id,
          username: participant.username ?? "",
          displayName: participant.displayName,
          avatarUrl: participant.avatarUrl,
          isVerified: participant.isVerified ?? false,
        }
      : {
          id: conversation.id,
          username: conversation.title ?? "Chat",
          isVerified: false,
        },
    lastMessage: lastMessage
      ? {
          text: lastMessage.body,
          messageType: lastMessage.messageType,
          senderId: lastMessage.senderId,
          senderName: lastMessage.metadata.sender?.username ?? "",
          messageId: lastMessage.id,
          isDeleted: lastMessage.deletedAt !== null,
          timestamp: lastMessage.createdAt,
        }
      : null,
    unreadCount: conversation.unreadCount,
  };
}

export function mergeUiMessages(
  current: UiMessage[],
  incoming: UiMessage[],
): UiMessage[] {
  const byKey = new Map<string, UiMessage>();
  for (const message of [...current, ...incoming]) {
    const key = message.clientId
      ? `client:${message.clientId}`
      : `id:${message.id}`;
    byKey.set(key, message);
  }
  return [...byKey.values()].sort((left, right) => {
    const byCreatedAt =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return byCreatedAt || left.id.localeCompare(right.id);
  });
}

export function mapLocalConversationSummaryToUi(
  row: {
    conversation: LocalConversationRow;
    lastMessage: LocalMessageRow | null;
  },
): UiConversation {
  return mapLocalConversationToUi(row.conversation, row.lastMessage);
}
