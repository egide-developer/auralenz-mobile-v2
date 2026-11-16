import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type {
  MessageAttachment,
  MessageReplyPreview,
  MessageType,
  ParticipantSnapshot,
} from "../db/schema";
import type { Message } from "../types";
import { enqueueOutboxItem } from "../repositories/outbox";
import { queueMessageLocally } from "../repositories/messages";

export interface QueuedAttachment {
  type: "image" | "audio" | "file";
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  duration?: number;
}

export interface QueueChatMessageInput {
  conversationId: string;
  sender: ParticipantSnapshot;
  text: string;
  attachments: QueuedAttachment[];
  messageType?: MessageType;
  replyTo?: MessageReplyPreview | null;
  viewOnce?: boolean;
  audioDuration?: number | null;
  clientId?: string;
  createdAt?: string;
}

async function persistAttachments(
  userId: string,
  clientId: string,
  attachments: QueuedAttachment[],
): Promise<QueuedAttachment[]> {
  if (attachments.length === 0) return attachments;
  const directory = new Directory(
    Paths.document,
    "message-outbox",
    encodeURIComponent(userId),
  );
  directory.create({ intermediates: true, idempotent: true });

  const createdFiles: File[] = [];
  try {
    const persisted: QueuedAttachment[] = [];
    for (const [index, attachment] of attachments.entries()) {
      if (attachment.uri.startsWith(directory.uri)) {
        persisted.push(attachment);
        continue;
      }

      const source = new File(attachment.uri);
      if (!source.exists) {
        throw new Error(`Queued attachment is no longer available: ${attachment.name}`);
      }
      const safeName =
        attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) ||
        "attachment";
      const destination = new File(
        directory,
        `${clientId}-${index}-${safeName}`,
      );
      if (!destination.exists) {
        try {
          await source.copy(destination);
        } catch (error) {
          if (destination.exists) destination.delete();
          throw error;
        }
        createdFiles.push(destination);
      }
      persisted.push({ ...attachment, uri: destination.uri });
    }
    return persisted;
  } catch (error) {
    for (const file of createdFiles) {
      if (file.exists) file.delete();
    }
    throw error;
  }
}

export async function enqueueChatMessage(
  userId: string,
  input: QueueChatMessageInput,
): Promise<{ clientId: string }> {
  const clientId = input.clientId ?? Crypto.randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const queuedAttachments = await persistAttachments(
    userId,
    clientId,
    input.attachments,
  );
  const attachments: MessageAttachment[] = queuedAttachments.map((attachment) => ({
    url: attachment.uri,
    type: attachment.type,
    mimeType: attachment.mimeType,
    originalName: attachment.name,
    ...(attachment.size !== undefined ? { size: attachment.size } : {}),
    ...(attachment.duration !== undefined ? { duration: attachment.duration } : {}),
  }));
  const messageType =
    input.messageType ??
    (input.attachments[0]?.type ?? "text");
  const replyTo = input.replyTo ?? null;
  const payload = {
    clientId,
    conversationId: input.conversationId,
    text: input.text,
    replyToId: replyTo?.id ?? null,
    viewOnce: input.viewOnce ?? false,
    audioDuration: input.audioDuration ?? null,
    attachments: queuedAttachments.map((attachment) => ({
      type: attachment.type,
      uri: attachment.uri,
      name: attachment.name,
      mimeType: attachment.mimeType,
      ...(attachment.size !== undefined ? { size: attachment.size } : {}),
      ...(attachment.duration !== undefined
        ? { duration: attachment.duration }
        : {}),
    })),
  };

  await queueMessageLocally(
    userId,
    {
      id: `local:${clientId}`,
      clientId,
      conversationId: input.conversationId,
      senderId: input.sender.id,
      body: input.text,
      attachments,
      messageType,
      status: "pending",
      seq: null,
      createdAt,
      updatedAt: createdAt,
      editedAt: null,
      deletedAt: null,
      metadata: {
        sender: input.sender,
        audioDuration: input.audioDuration ?? null,
        reactions: [],
        readBy: [],
        editHistory: [],
        replyTo,
        linkPreview: null,
        viewOnce: input.viewOnce ?? false,
        viewOnceOpened: false,
        viewOnceConsumedAt: null,
      },
    },
    payload,
  );
  return { clientId };
}

export function queuedAttachmentsFromMessage(message: Message): QueuedAttachment[] {
  return [
    ...message.images.map((uri) => ({
      type: "image" as const,
      uri,
      name: uri.split("/").pop() || "image.jpg",
      mimeType: "image/jpeg",
    })),
    ...(message.audioUrl
      ? [
          {
            type: "audio" as const,
            uri: message.audioUrl,
            name: `voice_${Date.now()}.m4a`,
            mimeType: "audio/m4a",
            ...(message.audioDuration != null
              ? { duration: message.audioDuration }
              : {}),
          },
        ]
      : []),
    ...(message.files ?? []).map((file) => ({
      type: "file" as const,
      uri: file.url,
      name: file.originalName || file.url.split("/").pop() || "file",
      mimeType: file.mimeType || "application/octet-stream",
      ...(file.size !== undefined ? { size: file.size } : {}),
    })),
  ];
}

export async function enqueueMarkRead(
  userId: string,
  conversationId: string,
): Promise<void> {
  await enqueueOutboxItem(userId, {
    id: `mark_read:${conversationId}`,
    type: "mark_read",
    payload: { conversationId },
  });
}
