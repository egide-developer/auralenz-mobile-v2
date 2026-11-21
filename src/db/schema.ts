import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type MessageType = "text" | "image" | "audio" | "file";
export type MessageAttachmentType = "image" | "audio" | "file";
export type OutboxType =
  | "send_message"
  | "create_post"
  | "edit_post"
  | "delete_post"
  | "mark_read";

export type PostStatus = "pending" | "sent" | "failed";

export interface ParticipantSnapshot {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface MessageAttachment {
  url: string;
  type: MessageAttachmentType;
  mimeType?: string;
  originalName?: string;
  size?: number;
  duration?: number;
}

export interface MessageReadEntry {
  user: string;
  readAt: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count?: number;
}

export interface MessageReplyPreview {
  id?: string;
  text?: string;
  isDeleted?: boolean;
  sender?: { username?: string };
}

export interface MessageEdit {
  text: string;
  editedAt: string;
}

export interface MessageLinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

export interface MessageMetadata {
  sender?: ParticipantSnapshot | null;
  audioDuration?: number | null;
  reactions?: MessageReaction[];
  readBy?: MessageReadEntry[];
  editHistory?: MessageEdit[];
  replyTo?: MessageReplyPreview | null;
  linkPreview?: MessageLinkPreview | null;
  viewOnce?: boolean;
  viewOnceOpened?: boolean;
  viewOnceConsumedAt?: string | null;
}

export interface ProfileCounts {
  posts: number;
  followers: number;
  following: number;
}

export interface PostMedia {
  url: string;
  type: "image" | "video" | "audio";
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  duration?: number;
}

export type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey().notNull(),
    title: text("title"),
    participants: text("participants", { mode: "json" })
      .$type<ParticipantSnapshot[]>()
      .notNull(),
    lastMessageId: text("last_message_id"),
    unreadCount: integer("unread_count").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("conversations_updated_at_idx").on(table.updatedAt)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey().notNull(),
    clientId: text("client_id"),
    conversationId: text("conversation_id").notNull(),
    senderId: text("sender_id").notNull(),
    body: text("body").notNull(),
    attachments: text("attachments", { mode: "json" })
      .$type<MessageAttachment[]>()
      .notNull(),
    messageType: text("message_type")
      .$type<MessageType>()
      .notNull()
      .default("text"),
    status: text("status")
      .$type<MessageStatus>()
      .notNull(),
    seq: integer("seq"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    editedAt: text("edited_at"),
    deletedAt: text("deleted_at"),
    metadata: text("metadata", { mode: "json" })
      .$type<MessageMetadata>()
      .notNull()
      .default(sql`'{}'`),
  },
  (table) => [
    index("messages_conversation_seq_idx").on(table.conversationId, table.seq),
    index("messages_conversation_created_at_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    uniqueIndex("messages_client_id_uidx").on(table.clientId),
  ],
);

export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey().notNull(),
    displayName: text("display_name"),
    username: text("username").notNull(),
    bio: text("bio"),
    avatar: text("avatar"),
    counts: text("counts", { mode: "json" }).$type<ProfileCounts>().notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("profiles_updated_at_idx").on(table.updatedAt)],
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey().notNull(),
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    media: text("media", { mode: "json" }).$type<PostMedia[]>().notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at"),
    clientId: text("client_id"),
    status: text("status").$type<PostStatus>().notNull().default("sent"),
    previousContent: text("previous_content"),
    previousMedia: text("previous_media"),
  },
  (table) => [
    index("posts_author_created_at_idx").on(table.authorId, table.createdAt),
    uniqueIndex("posts_client_id_uidx").on(table.clientId),
  ],
);

export const searchCache = sqliteTable(
  "search_cache",
  {
    queryKey: text("query_key").primaryKey().notNull(),
    results: text("results", { mode: "json" }).$type<JsonValue>().notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => [index("search_cache_fetched_at_idx").on(table.fetchedAt)],
);

/** Search terms the user committed to, newest first. One row per term. */
export const recentSearches = sqliteTable(
  "recent_searches",
  {
    term: text("term").primaryKey().notNull(),
    lastSearchedAt: text("last_searched_at").notNull(),
  },
  (table) => [
    index("recent_searches_last_searched_at_idx").on(table.lastSearchedAt),
  ],
);

export const outbox = sqliteTable(
  "outbox",
  {
    id: text("id").primaryKey().notNull(),
    type: text("type").$type<OutboxType>().notNull(),
    payload: text("payload", { mode: "json" })
      .$type<{ [key: string]: JsonValue }>()
      .notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextRetryAt: text("next_retry_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("outbox_created_at_idx").on(table.createdAt)],
);

export const syncState = sqliteTable("sync_state", {
  resourceKey: text("resource_key").primaryKey().notNull(),
  cursor: text("cursor"),
  lastSyncedAt: text("last_synced_at"),
});

export const messagePages = sqliteTable(
  "message_pages",
  {
    conversationId: text("conversation_id").notNull(),
    page: integer("page").notNull(),
    messageIds: text("message_ids", { mode: "json" }).$type<string[]>().notNull(),
    hasMore: integer("has_more", { mode: "boolean" }).notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => [
    primaryKey({
      name: "message_pages_pk",
      columns: [table.conversationId, table.page],
    }),
  ],
);

export const localSchema = {
  conversations,
  messages,
  profiles,
  posts,
  searchCache,
  recentSearches,
  outbox,
  syncState,
  messagePages,
};
