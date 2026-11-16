import axios from "axios";
import api from "../api/client";
import { API } from "../api/endpoints";
import type { JsonValue } from "../db/schema";
import {
  completeMessageSend,
  completeOutboxItem,
  listOutboxItems,
  recordOutboxFailure,
} from "../repositories/outbox";
import { mapMessagePayload } from "../repositories/chatMappers";
import type { MessageWrite } from "../repositories/messages";
import type { OutboxItem } from "../repositories/outbox";
import {
  reconcilePostCreate,
  reconcilePostUpdate,
  reconcilePostDelete,
  rollbackPostCreate,
  rollbackPostUpdate,
  rollbackPostDelete,
} from "../repositories/posts";
import type { PostWrite } from "../repositories/posts";
import { mapPostPayload } from "../repositories/profileMappers";

const MAX_ATTEMPTS = 8;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

interface ReactNativeUploadAsset {
  uri: string;
  name: string;
  type: string;
}

interface ReactNativeFormData {
  append(
    name: string,
    value: string | ReactNativeUploadAsset,
    filename?: string,
  ): void;
}

interface OutboundAttachment {
  type: "image" | "audio" | "file";
  uri: string;
  name: string;
  mimeType: string;
}

interface SendMessagePayload {
  clientId: string;
  conversationId: string;
  text: string;
  replyToId: string | null;
  viewOnce: boolean;
  audioDuration: number | null;
  attachments: OutboundAttachment[];
}

interface CreatePostPayload {
  clientId: string;
  caption: string;
  media: Array<{ uri: string; type: string; name: string }>;
}

interface EditPostPayload {
  postId: string;
  caption: string;
  media: Array<{ uri: string; type: string; name: string }>;
}

interface DeletePostPayload {
  postId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseSendPayload(item: OutboxItem): SendMessagePayload {
  const payload = item.payload;
  const clientId = stringValue(payload.clientId);
  const conversationId = stringValue(payload.conversationId);
  const text = typeof payload.text === "string" ? payload.text : "";
  const attachments = Array.isArray(payload.attachments)
    ? payload.attachments.flatMap((value): OutboundAttachment[] => {
        if (!isRecord(value)) return [];
        const type = value.type;
        const uri = value.uri;
        const name = value.name;
        const mimeType = value.mimeType;
        if (
          (type !== "image" && type !== "audio" && type !== "file") ||
          typeof uri !== "string" ||
          typeof name !== "string" ||
          typeof mimeType !== "string"
        ) {
          return [];
        }
        return [{ type, uri, name, mimeType }];
      })
    : [];
  if (!clientId || !conversationId) {
    throw new Error(`Outbox message ${item.id} has an invalid payload`);
  }

  return {
    clientId,
    conversationId,
    text,
    replyToId: stringValue(payload.replyToId),
    viewOnce: payload.viewOnce === true,
    audioDuration:
      typeof payload.audioDuration === "number" ? payload.audioDuration : null,
    attachments,
  };
}

function extractServerMessage(value: unknown): unknown {
  let candidate = value;
  for (let depth = 0; depth < 3 && isRecord(candidate); depth += 1) {
    if ("message" in candidate) {
      candidate = candidate.message;
      continue;
    }
    if ("data" in candidate) {
      candidate = candidate.data;
      continue;
    }
    break;
  }
  return candidate;
}

async function postMessage(payload: SendMessagePayload): Promise<unknown> {
  const { conversationId, text, replyToId, viewOnce, audioDuration, attachments } = payload;
  if (attachments.length === 0) {
    const response = await api.post<unknown>(API.messages.send(conversationId), {
      clientId: payload.clientId,
      text,
      replyTo: replyToId ?? undefined,
      viewOnce: viewOnce || undefined,
    });
    return response.data;
  }

  const formData = new FormData();
  const nativeFormData = formData as ReactNativeFormData;
  formData.append("clientId", payload.clientId);
  if (text) formData.append("text", text);
  if (replyToId) formData.append("replyTo", replyToId);
  if (viewOnce) formData.append("viewOnce", "true");
  if (audioDuration !== null) {
    formData.append("audioDuration", String(audioDuration));
  }
  for (const attachment of attachments) {
    const field = attachment.type === "image" ? "images" : attachment.type === "audio" ? "audio" : "files";
    nativeFormData.append(
      field,
      {
        uri: attachment.uri,
        name: attachment.name,
        type: attachment.mimeType,
      },
      attachment.name,
    );
  }

  const response = await api.post<unknown>(
    API.messages.send(conversationId),
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    },
  );
  return response.data;
}

async function processSendMessage(
  userId: string,
  item: OutboxItem,
): Promise<void> {
  const payload = parseSendPayload(item);
  const response = await postMessage(payload);
  const mapped = mapMessagePayload(
    extractServerMessage(response),
    payload.conversationId,
  );
  if (!mapped) {
    throw new Error("The message endpoint returned an invalid message");
  }

  const confirmed: MessageWrite = {
    ...mapped,
    clientId: payload.clientId,
    status: "sent",
  };
  await completeMessageSend(userId, payload.clientId, confirmed);
}

async function processCreatePost(
  userId: string,
  item: OutboxItem,
): Promise<void> {
  const payload = item.payload as unknown as CreatePostPayload;
  const clientId = stringValue(payload.clientId);
  if (!clientId) {
    throw new Error(`Outbox create_post ${item.id} has no clientId`);
  }

  const formData = new FormData();
  const nativeFormData = formData as ReactNativeFormData;
  formData.append("caption", payload.caption);
  for (const media of payload.media) {
    nativeFormData.append("media", { uri: media.uri, name: media.name, type: media.type }, media.name);
  }

  const response = await api.post<unknown>(API.posts.list, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });

  const serverPost = mapPostPayload(extractServerMessage(response.data));
  if (!serverPost) {
    throw new Error("The post create endpoint returned an invalid post");
  }

  const confirmed: PostWrite = {
    ...serverPost,
    clientId,
    status: "sent",
  };
  await reconcilePostCreate(userId, clientId, confirmed);
  await completeOutboxItem(userId, item.id);
}

async function processEditPost(
  userId: string,
  item: OutboxItem,
): Promise<void> {
  const payload = item.payload as unknown as EditPostPayload;
  const postId = stringValue(payload.postId);
  if (!postId) {
    throw new Error(`Outbox edit_post ${item.id} has no postId`);
  }

  const formData = new FormData();
  const nativeFormData = formData as ReactNativeFormData;
  formData.append("caption", payload.caption);
  for (const media of payload.media) {
    nativeFormData.append("media", { uri: media.uri, name: media.name, type: media.type }, media.name);
  }

  const response = await api.put<unknown>(API.posts.byId(postId), formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });

  const serverPost = mapPostPayload(extractServerMessage(response.data));
  if (!serverPost) {
    throw new Error("The post edit endpoint returned an invalid post");
  }

  await reconcilePostUpdate(userId, postId, serverPost);
  await completeOutboxItem(userId, item.id);
}

async function processDeletePost(
  userId: string,
  item: OutboxItem,
): Promise<void> {
  const payload = item.payload as unknown as DeletePostPayload;
  const postId = stringValue(payload.postId);
  if (!postId) {
    throw new Error(`Outbox delete_post ${item.id} has no postId`);
  }

  await api.delete<unknown>(API.posts.byId(postId));

  await reconcilePostDelete(userId, postId);
  await completeOutboxItem(userId, item.id);
}

function getConversationId(item: OutboxItem): string | null {
  return stringValue(item.payload.conversationId);
}

function isPermanentFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
}

export function retryDelayMs(attempt: number, random = Math.random()): number {
  const exponent = Math.max(0, Math.min(20, Math.floor(attempt) - 1));
  const base = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** exponent);
  const jitter = 0.5 + Math.min(1, Math.max(0, random));
  return Math.round(Math.min(MAX_RETRY_DELAY_MS, base * jitter));
}

export async function processOutboxQueue(
  userId: string,
  options: { now?: number; random?: () => number } = {},
): Promise<void> {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;
  const items = await listOutboxItems(userId);
  const blockedConversations = new Set<string>();

  for (const item of items) {
    const isPostOperation = item.type === "create_post" || item.type === "edit_post" || item.type === "delete_post";
    if (item.type !== "send_message" && item.type !== "mark_read" && !isPostOperation) continue;
    const conversationId = getConversationId(item);
    if (conversationId && blockedConversations.has(conversationId)) continue;

    if (item.nextRetryAt) {
      const nextAttemptAt = new Date(item.nextRetryAt).getTime();
      if (Number.isFinite(nextAttemptAt) && nextAttemptAt > now) {
        if (conversationId) blockedConversations.add(conversationId);
        continue;
      }
    }

    try {
      if (item.type === "send_message") {
        await processSendMessage(userId, item);
      } else if (item.type === "create_post") {
        await processCreatePost(userId, item);
      } else if (item.type === "edit_post") {
        await processEditPost(userId, item);
      } else if (item.type === "delete_post") {
        await processDeletePost(userId, item);
      } else {
        if (!conversationId) {
          throw new Error(`Read receipt ${item.id} has no conversation ID`);
        }
        await api.post<unknown>(API.messages.read(conversationId));
        await completeOutboxItem(userId, item.id);
      }
    } catch (error) {
      const permanent = isPermanentFailure(error);
      const nextAttempt = item.attempts + 1;
      const nextRetryAt = permanent
        ? null
        : new Date(now + retryDelayMs(nextAttempt, random())).toISOString();
      const result = await recordOutboxFailure(
        userId,
        item.id,
        nextRetryAt,
        MAX_ATTEMPTS,
      );
      console.warn(
        `[Outbox] ${item.type} ${item.id} ${result.failed ? "failed permanently" : "will retry"}`,
        error,
      );

      if (result.failed) {
        if (item.type === "create_post") {
          await rollbackPostCreate(userId, item.id);
        } else if (item.type === "edit_post") {
          const postId = stringValue(item.payload.postId);
          if (postId) await rollbackPostUpdate(userId, postId);
        } else if (item.type === "delete_post") {
          const postId = stringValue(item.payload.postId);
          if (postId) await rollbackPostDelete(userId, postId);
        }
      }

      if (!result.failed && conversationId) {
        blockedConversations.add(conversationId);
      }
    }
  }
}

