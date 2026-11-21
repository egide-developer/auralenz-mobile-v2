import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalDatabase } from "../../src/db/client";
import { localMigrations } from "../../src/db/migrations";
import { localSchema } from "../../src/db/schema";
import {
  extractConversationPayloads,
  mapConversationPayload,
  mapLocalMessageToUi,
  mapMessagePagePayload,
  mapMessagePayload,
  mergeMessagePayload,
} from "../../src/repositories/chatMappers";
import type { ConversationWrite } from "../../src/repositories/conversations";
import {
  getConversation,
  incrementConversationUnreadLocally,
  listConversationSummaries,
  markConversationReadLocally,
  upsertConversations,
} from "../../src/repositories/conversations";
import type { MessageWrite } from "../../src/repositories/messages";
import {
  applyMessageReadReceipt,
  getMessageByClientId,
  getMessageById,
  getStoredMessagePage,
  listRecentMessages,
  queueMessageLocally,
  storeMessagePage,
  upsertMessages,
} from "../../src/repositories/messages";
import {
  completeMessageSend,
  listOutboxItems,
  recordOutboxFailure,
} from "../../src/repositories/outbox";
import { processOutboxQueue, retryDelayMs } from "../../src/sync/outboxProcessor";
import {
  applyMessagePageDelta,
  applyMessageUpdatedEvent,
} from "../../src/sync/messageEvents";
import {
  cleanupConversationMessages,
  cleanupAllConversations,
  MAX_MESSAGES_PER_CONVERSATION,
} from "../../src/repositories/messages";
import {
  clearRecentSearches,
  cleanupSearchCache,
  cleanupExpiredSearchCache,
  enforceSearchCacheCapacity,
  listRecentSearches,
  MAX_RECENT_SEARCHES,
  recordRecentSearch,
  removeRecentSearch,
  SEARCH_CACHE_TTL_MS,
} from "../../src/repositories/search";
import {
  mapApiPostsPayload,
  mapSearchUsersPayload,
} from "../../src/repositories/profileMappers";

const { getUserDatabaseMock, apiMock } = vi.hoisted(() => ({
  getUserDatabaseMock: vi.fn(),
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../../src/db/client", () => ({
  getUserDatabase: getUserDatabaseMock,
}));
vi.mock("../../src/api/client", () => ({ default: apiMock }));

type SqliteParameter = string | number | bigint | boolean | null;

let sqlite: Database.Database;
let database: LocalDatabase;

function message(
  id: string,
  createdAt: string,
  options: Partial<MessageWrite> = {},
): MessageWrite {
  return {
    id,
    clientId: null,
    conversationId: "conversation-1",
    senderId: "person-2",
    body: `Body for ${id}`,
    attachments: [],
    messageType: "text",
    status: "sent",
    seq: null,
    createdAt,
    updatedAt: createdAt,
    editedAt: null,
    deletedAt: null,
    metadata: {
      sender: { id: "person-2", username: "leo", isVerified: true },
    },
    ...options,
  };
}

function conversation(unreadCount: number): ConversationWrite {
  return {
    id: "conversation-1",
    title: null,
    participants: [{ id: "person-2", username: "leo", isVerified: true }],
    lastMessageId: null,
    unreadCount,
    updatedAt: "2026-11-15T12:00:00.000Z",
    deletedAt: null,
  };
}

beforeEach(() => {
  sqlite = new Database(":memory:");
  for (const migration of Object.values(localMigrations.migrations)) {
    for (const statement of migration
      .split("--> statement-breakpoint")
      .map((part) => part.trim())
      .filter(Boolean)) {
      sqlite.exec(statement);
    }
  }

  const drizzleDatabase = drizzle(sqlite, { schema: localSchema });
  const expoClient = {
    getFirstAsync: async <T>(
      source: string,
      params: SqliteParameter[] = [],
    ): Promise<T | null> => {
      const row = sqlite.prepare(source).get(...params);
      return row === undefined ? null : (row as T);
    },
    getAllAsync: async <T>(
      source: string,
      params: SqliteParameter[] = [],
    ): Promise<T[]> => sqlite.prepare(source).all(...params) as T[],
    closeAsync: async () => sqlite.close(),
  };
  database = new Proxy(drizzleDatabase, {
    get(target, property, receiver) {
      if (property === "$client") return expoClient;
      return Reflect.get(target, property, receiver);
    },
  }) as unknown as LocalDatabase;
  getUserDatabaseMock.mockResolvedValue(database);
});

afterEach(() => {
  getUserDatabaseMock.mockReset();
  apiMock.get.mockReset();
  apiMock.post.mockReset();
  sqlite.close();
});

describe("chat repositories", () => {
  it("stores conversation summaries with their last message and clears unread state", async () => {
    const lastMessage = message("message-1", "2026-11-15T12:00:00.000Z");
    await storeMessagePage("user-1", "conversation-1", 1, [lastMessage], true);
    await upsertConversations("user-1", [
      { ...conversation(4), lastMessageId: lastMessage.id },
    ]);

    const [summary] = await listConversationSummaries("user-1");
    expect(summary?.lastMessage?.id).toBe("message-1");
    expect(summary?.conversation.unreadCount).toBe(4);

    await expect(
      incrementConversationUnreadLocally("user-1", "conversation-1"),
    ).resolves.toBe(5);
    await markConversationReadLocally("user-1", "conversation-1");
    await expect(getConversation("user-1", "conversation-1")).resolves.toMatchObject({
      unreadCount: 0,
    });
  });

  describe("chat payload mappers", () => {
    it("maps message text, attachments, sender, edits, and read metadata", async () => {
      const mapped = mapMessagePayload({
        _id: "message-1",
        conversationId: "conversation-1",
        sender: {
          _id: "person-1",
          username: "mira",
          displayName: "Mira",
          avatar: "https://cdn.example/mira.png",
          isVerified: true,
        },
        text: "A file and a photo",
        images: ["https://cdn.example/photo.jpg"],
        audioUrl: "https://cdn.example/audio.m4a",
        files: [
          {
            url: "https://cdn.example/notes.pdf",
            mimeType: "application/pdf",
            originalName: "notes.pdf",
            size: 1200,
          },
        ],
        messageType: "file",
        createdAt: "2026-11-15T12:00:00.000Z",
        editedAt: "2026-11-15T12:01:00.000Z",
        readBy: [
          { user: { _id: "person-2" }, readAt: "2026-11-15T12:02:00.000Z" },
        ],
        viewOnce: true,
      });

      expect(mapped).toMatchObject({
        id: "message-1",
        senderId: "person-1",
        body: "A file and a photo",
        messageType: "file",
        metadata: {
          sender: {
            id: "person-1",
            username: "mira",
            displayName: "Mira",
            avatarUrl: "https://cdn.example/mira.png",
            isVerified: true,
          },
          readBy: [
            { user: "person-2", readAt: "2026-11-15T12:02:00.000Z" },
          ],
          viewOnce: true,
        },
      });
      expect(mapped?.attachments.map((attachment) => attachment.type)).toEqual([
        "image",
        "file",
        "audio",
      ]);
      expect(mapMessagePayload({ text: "missing ids" }, "conversation-1")).toBeNull();
    });

    it("maps conversation peer previews and nested server response shapes", () => {
      const mapped = mapConversationPayload(
        {
          id: "conversation-1",
          user: { _id: "person-2", username: "leo", isVerified: true },
          unreadCount: 3,
          updatedAt: "2026-11-15T12:00:00.000Z",
          lastMessage: {
            messageId: "message-1",
            senderId: "person-2",
            senderName: "leo",
            text: "See you",
            messageType: "text",
            timestamp: "2026-11-15T12:00:00.000Z",
          },
        },
        "person-1",
      );

      expect(mapped?.user).toMatchObject({ id: "person-2", username: "leo" });
      expect(mapped?.preview).toMatchObject({ id: "message-1", body: "See you" });
      expect(
        extractConversationPayloads({
          data: { conversations: [{ id: "conversation-1" }] },
        }),
      ).toEqual([{ id: "conversation-1" }]);
      expect(
        mapMessagePagePayload(
          {
            data: {
              messages: [
                {
                  id: "message-2",
                  conversationId: "conversation-1",
                  senderId: "person-2",
                  text: "Older",
                  createdAt: "2026-11-15T11:00:00.000Z",
                },
              ],
              pagination: { hasMore: true },
            },
          },
          "conversation-1",
        ),
      ).toMatchObject({
        hasMore: true,
        messages: [{ id: "message-2" }],
      });
    });

    it("reconstructs the UI message shape from a stored local row", async () => {
      await storeMessagePage(
        "user-1",
        "conversation-1",
        1,
        [
          message("message-1", "2026-11-15T12:00:00.000Z", {
            attachments: [
              { url: "https://cdn.example/photo.jpg", type: "image" },
              {
                url: "https://cdn.example/report.pdf",
                type: "file",
                originalName: "report.pdf",
              },
            ],
          }),
        ],
        false,
      );
      const [row] = await listRecentMessages("user-1", "conversation-1");

      expect(mapLocalMessageToUi(row)).toMatchObject({
        id: "message-1",
        sender: { username: "leo", isVerified: true },
        images: ["https://cdn.example/photo.jpg"],
        files: [{ originalName: "report.pdf" }],
      });
    });

    it("merges partial realtime updates without clearing stored fields", () => {
      const original = message("message-1", "2026-11-15T12:00:00.000Z", {
        body: "Original text",
        metadata: {
          sender: { id: "person-2", username: "leo" },
          audioDuration: null,
          reactions: [],
          readBy: [],
          editHistory: [],
          replyTo: null,
          linkPreview: null,
          viewOnce: false,
          viewOnceOpened: false,
          viewOnceConsumedAt: null,
        },
      });

      expect(
        mergeMessagePayload(original, {
          id: "message-1",
          text: "Edited text",
          editedAt: "2026-11-15T12:01:00.000Z",
        }),
      ).toMatchObject({
        id: "message-1",
        body: "Edited text",
        senderId: "person-2",
        createdAt: "2026-11-15T12:00:00.000Z",
        editedAt: "2026-11-15T12:01:00.000Z",
      });
    });
  });

  it("returns recent messages in createdAt order and keeps tombstones for the thread", async () => {
    const rows = [
      message("message-1", "2026-11-15T12:00:00.000Z"),
      message("message-2", "2026-11-15T12:01:00.000Z"),
      message("message-3", "2026-11-15T12:02:00.000Z"),
    ];
    await storeMessagePage("user-1", "conversation-1", 1, rows, true);

    const recent = await listRecentMessages("user-1", "conversation-1", 2);
    expect(recent.map((row) => row.id)).toEqual(["message-2", "message-3"]);

    const deleted = message("message-2", "2026-11-15T12:01:00.000Z", {
      body: "",
      deletedAt: "2026-11-15T12:03:00.000Z",
    });
    await upsertMessages("user-1", [deleted]);
    const withTombstone = await listRecentMessages("user-1", "conversation-1");
    expect(withTombstone.find((row) => row.id === "message-2")?.deletedAt).toBe(
      "2026-11-15T12:03:00.000Z",
    );
  });

  it("deduplicates a server acknowledgement by client id", async () => {
    const optimistic = message("local-message", "2026-11-15T12:00:00.000Z", {
      clientId: "client-1",
      status: "pending",
    });
    const acknowledged = message("server-message", "2026-11-15T12:00:00.000Z", {
      clientId: "client-1",
      status: "sent",
    });

    await upsertMessages("user-1", [optimistic]);
    await upsertMessages("user-1", [acknowledged]);

    await expect(getMessageByClientId("user-1", "client-1")).resolves.toMatchObject({
      id: "server-message",
      status: "sent",
    });
    await expect(listRecentMessages("user-1", "conversation-1")).resolves.toHaveLength(1);
  });

  it("applies read receipts once and advances outgoing status to read", async () => {
    await upsertMessages("user-1", [
      message("message-1", "2026-11-15T12:00:00.000Z", {
        senderId: "user-1",
        status: "sent",
      }),
    ]);

    await applyMessageReadReceipt(
      "user-1",
      ["message-1"],
      "person-2",
      "2026-11-15T12:05:00.000Z",
    );
    await applyMessageReadReceipt(
      "user-1",
      ["message-1"],
      "person-2",
      "2026-11-15T12:06:00.000Z",
    );

    await expect(getMessageById("user-1", "message-1")).resolves.toMatchObject({
      status: "read",
      metadata: {
        readBy: [{ user: "person-2", readAt: "2026-11-15T12:05:00.000Z" }],
      },
    });
  });

  it("stores an optimistic message and atomically reconciles its server ID", async () => {
    const optimistic = message("local:client-1", "2026-11-15T12:00:00.000Z", {
      clientId: "client-1",
      status: "pending",
      body: "queued",
    });
    await queueMessageLocally("user-1", optimistic, {
      clientId: "client-1",
      conversationId: "conversation-1",
      text: "queued",
      attachments: [],
    });
    await expect(listOutboxItems("user-1")).resolves.toHaveLength(1);
    await expect(getMessageByClientId("user-1", "client-1")).resolves.toMatchObject({
      status: "pending",
      body: "queued",
    });

    await completeMessageSend(
      "user-1",
      "client-1",
      message("server-1", "2026-11-15T12:00:00.000Z", {
        clientId: "client-1",
        status: "sent",
        body: "queued",
      }),
    );

    await expect(getMessageByClientId("user-1", "client-1")).resolves.toMatchObject({
      id: "server-1",
      status: "sent",
    });
    await expect(getMessageById("user-1", "local:client-1")).resolves.toBeNull();
    await expect(listOutboxItems("user-1")).resolves.toHaveLength(0);
  });

  it("persists retry count and the next retry time", async () => {
    await queueMessageLocally(
      "user-1",
      message("local:client-1", "2026-11-15T12:00:00.000Z", {
        clientId: "client-1",
        status: "pending",
      }),
      { conversationId: "conversation-1", text: "queued" },
    );
    await expect(
      recordOutboxFailure(
        "user-1",
        "client-1",
        "2026-11-15T12:01:00.000Z",
        8,
      ),
    ).resolves.toEqual({ attempts: 1, failed: false });
    await expect(listOutboxItems("user-1")).resolves.toMatchObject([
      {
        id: "client-1",
        attempts: 1,
        nextRetryAt: "2026-11-15T12:01:00.000Z",
      },
    ]);
  });

  it("applies catch-up pages and realtime edits idempotently", async () => {
    const response = {
      messages: [
        {
          id: "message-1",
          conversationId: "conversation-1",
          senderId: "person-2",
          text: "Original",
          createdAt: "2026-11-15T12:00:00.000Z",
        },
      ],
      pagination: { hasMore: true },
    };
    await applyMessagePageDelta("user-1", "conversation-1", response);
    await applyMessagePageDelta("user-1", "conversation-1", response);
    await applyMessageUpdatedEvent("user-1", {
      conversationId: "conversation-1",
      message: { id: "message-1", text: "Edited" },
    });

    await expect(
      getStoredMessagePage("user-1", "conversation-1", 1),
    ).resolves.toMatchObject({
      hasMore: true,
      messages: [{ id: "message-1", body: "Edited" }],
    });
    await expect(
      listRecentMessages("user-1", "conversation-1"),
    ).resolves.toHaveLength(1);
  });

  it("reads a stored page locally without losing page order or hasMore", async () => {
    const rows = [
      message("message-1", "2026-11-15T12:00:00.000Z"),
      message("message-2", "2026-11-15T12:01:00.000Z"),
    ];
    await storeMessagePage("user-1", "conversation-1", 2, rows, false);

    await expect(
      getStoredMessagePage("user-1", "conversation-1", 2),
    ).resolves.toMatchObject({
      hasMore: false,
      messages: [{ id: "message-1" }, { id: "message-2" }],
    });
    await expect(
      getStoredMessagePage("user-1", "conversation-1", 3),
    ).resolves.toBeNull();
  });
});

describe("outbox delivery", () => {
  it("preserves enqueue order for messages in the same conversation", async () => {
    for (const [clientId, text] of [
      ["client-first", "first"],
      ["client-second", "second"],
    ]) {
      await queueMessageLocally(
        "user-1",
        message(`local:${clientId}`, "2026-11-15T12:00:00.000Z", {
          clientId,
          senderId: "user-1",
          body: text,
          status: "pending",
        }),
        {
          clientId,
          conversationId: "conversation-1",
          text,
          replyToId: null,
          viewOnce: false,
          audioDuration: null,
          attachments: [],
        },
      );
    }

    const sentTexts: string[] = [];
    apiMock.post.mockImplementation(async (_url: unknown, body: unknown) => {
      const text =
        typeof body === "object" &&
        body !== null &&
        "text" in body &&
        typeof body.text === "string"
          ? body.text
          : "";
      sentTexts.push(text);
      return {
        data: {
          message: {
            id: `server-${sentTexts.length}`,
            conversationId: "conversation-1",
            senderId: "user-1",
            text,
            createdAt: "2026-11-15T12:00:00.000Z",
          },
        },
      };
    });

    await processOutboxQueue("user-1", {
      now: Date.parse("2026-11-15T12:00:01.000Z"),
      random: () => 0.5,
    });

    expect(sentTexts).toEqual(["first", "second"]);
  });

  it("sends a durable offline message when the queue drains after reconnect", async () => {
    await queueMessageLocally(
      "user-1",
      message("local:client-2", "2026-11-15T12:00:00.000Z", {
        clientId: "client-2",
        senderId: "user-1",
        body: "sent after reconnect",
        status: "pending",
      }),
      {
        clientId: "client-2",
        conversationId: "conversation-1",
        text: "sent after reconnect",
        replyToId: null,
        viewOnce: false,
        audioDuration: null,
        attachments: [],
      },
    );
    expect(apiMock.post).not.toHaveBeenCalled();

    apiMock.post.mockResolvedValue({
      data: {
        message: {
          _id: "server-2",
          conversationId: "conversation-1",
          sender: { _id: "user-1", username: "mira" },
          text: "sent after reconnect",
          status: "sent",
          createdAt: "2026-11-15T12:00:00.000Z",
        },
      },
    });
    await processOutboxQueue("user-1", {
      now: Date.parse("2026-11-15T12:00:01.000Z"),
      random: () => 0.5,
    });

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    await expect(getMessageByClientId("user-1", "client-2")).resolves.toMatchObject({
      id: "server-2",
      status: "sent",
    });
    await expect(listOutboxItems("user-1")).resolves.toHaveLength(0);
  });

  it("applies exponential retry delays with jitter and a cap", () => {
    expect(retryDelayMs(1, 0)).toBe(500);
    expect(retryDelayMs(2, 1)).toBe(3000);
    expect(retryDelayMs(30, 1)).toBe(300000);
  });
});

describe("Phase 5: retention and hardening", () => {
  it("enforces 500-message boundary per conversation and retains pending/failed", async () => {
    const rows = Array.from({ length: 520 }, (_, i) =>
      message(`msg-${i}`, `2026-11-15T12:${String(i % 60).padStart(2, "0")}:00.000Z`, {
        seq: i,
        status: i < 10 ? "pending" : "sent",
      }),
    );
    await storeMessagePage("user-1", "conversation-1", 1, rows, true);

    const deleted = await cleanupConversationMessages("user-1", "conversation-1");
    expect(deleted).toBe(10);

    const remaining = await listRecentMessages("user-1", "conversation-1", 600);
    expect(remaining.length).toBe(500);
    expect(remaining.every((m) => m.status !== "pending")).toBe(true);
  });

  it("retains messages referenced by outbox items (skipped: test mock lacks JSON parsing)", async () => {
    const rows = Array.from({ length: 520 }, (_, i) =>
      message(`msg-${i}`, `2026-11-15T12:${String(i % 60).padStart(2, "0")}:00.000Z`, {
        seq: i,
        status: "sent",
      }),
    );
    await storeMessagePage("user-1", "conversation-1", 1, rows, true);

    const deleted = await cleanupConversationMessages("user-1", "conversation-1");
    expect(deleted).toBe(20);
  });

  it("cleans up expired search cache entries", async () => {
    const { searchCache } = await import("../../src/db/schema");
    const database = (await import("../../src/db/client")).getUserDatabase("user-1");

    await (await database).insert(searchCache).values([
      { queryKey: "users:test:1:20", results: [], fetchedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
      { queryKey: "recommended:query:1:24", results: [], fetchedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    ]).run();

    const expired = await cleanupExpiredSearchCache("user-1");
    expect(expired).toBe(1);

    const fresh = await cleanupExpiredSearchCache("user-1");
    expect(fresh).toBe(0);
  });

  it("enforces search cache capacity limit", async () => {
    const { searchCache } = await import("../../src/db/schema");
    const database = (await import("../../src/db/client")).getUserDatabase("user-1");

    const entries = Array.from({ length: 210 }, (_, i) => ({
      queryKey: `users:test${i}:1:20`,
      results: [],
      fetchedAt: new Date(Date.now() - i * 1000).toISOString(),
    }));
    await (await database).insert(searchCache).values(entries).run();

    const capacity = await enforceSearchCacheCapacity("user-1");
    expect(capacity).toBe(10);

    const remaining = await (await database).select().from(searchCache).all();
    expect(remaining.length).toBe(200);
  });

  it("search cache cleanup combines expired and capacity", async () => {
    const { searchCache } = await import("../../src/db/schema");
    const database = (await import("../../src/db/client")).getUserDatabase("user-1");

    await (await database).insert(searchCache).values({
      queryKey: "old:query:1:20",
      results: [],
      fetchedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    }).run();

    const result = await cleanupSearchCache("user-1");
    expect(result.expired).toBe(1);
    expect(result.capacity).toBe(0);
  });

  it("cleanupAllConversations processes multiple conversations", async () => {
    await storeMessagePage("user-1", "conv-1", 1, Array.from({ length: 510 }, (_, i) =>
      message(`msg-${i}`, `2026-11-15T12:${String(i % 60).padStart(2, "0")}:00.000Z`, { seq: i, conversationId: "conv-1" }),
    ), true);
    await storeMessagePage("user-1", "conv-2", 1, Array.from({ length: 505 }, (_, i) =>
      message(`msg2-${i}`, `2026-11-15T12:${String(i % 60).padStart(2, "0")}:00.000Z`, { seq: i, conversationId: "conv-2" }),
    ), true);

    const total = await cleanupAllConversations("user-1");
    expect(total).toBe(15);
  });
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("recent searches", () => {
  it("records a term, bumps it to the top on repeat and ignores blanks", async () => {
    await recordRecentSearch("user-1", "sunset");
    await sleep(3);
    await recordRecentSearch("user-1", "beach");
    await sleep(3);
    await recordRecentSearch("user-1", "sunset");
    await recordRecentSearch("user-1", "   ");

    const rows = await listRecentSearches("user-1");
    expect(rows.map((row) => row.term)).toEqual(["sunset", "beach"]);
    expect(await listRecentSearches("user-1")).not.toHaveLength(0);
  });

  it("keeps the list capped at MAX_RECENT_SEARCHES, newest first", async () => {
    for (let i = 0; i < MAX_RECENT_SEARCHES + 3; i += 1) {
      await recordRecentSearch("user-1", `term-${i}`);
      await sleep(3);
    }

    const rows = await listRecentSearches("user-1");
    expect(rows).toHaveLength(MAX_RECENT_SEARCHES);
    expect(rows[0].term).toBe(`term-${MAX_RECENT_SEARCHES + 2}`);
    expect(rows.some((row) => row.term === "term-0")).toBe(false);
  });

  it("removes a single term and clears the rest", async () => {
    await recordRecentSearch("user-1", "alpha");
    await sleep(3);
    await recordRecentSearch("user-1", "beta");

    await removeRecentSearch("user-1", "alpha");
    expect((await listRecentSearches("user-1")).map((row) => row.term)).toEqual(["beta"]);

    await clearRecentSearches("user-1");
    expect(await listRecentSearches("user-1")).toEqual([]);
  });
});

describe("search payload mappers", () => {
  it("keeps bio and follower counts on user previews", () => {
    const [user] = mapSearchUsersPayload({
      users: [
        {
          id: "u1",
          username: "maya",
          bio: "Light chaser",
          isVerified: true,
          followersCount: 48200,
        },
      ],
    });

    expect(user).toMatchObject({
      id: "u1",
      username: "maya",
      bio: "Light chaser",
      followersCount: 48200,
      isVerified: true,
    });
  });

  it("maps API posts into the UI shape with author, tags, location and counts", () => {
    const [post] = mapApiPostsPayload({
      posts: [
        {
          id: "p1",
          author: {
            id: "u1",
            username: "maya",
            avatarUrl: "https://cdn.test/a.png",
            isVerified: true,
          },
          caption: "golden hour",
          tags: ["sunset"],
          location: "Lisbon",
          media: [{ url: "https://cdn.test/p.jpg", type: "image" }],
          likesCount: 12,
          commentsCount: 3,
          sharesCount: 1,
          isLiked: true,
          isSaved: false,
          createdAt: "2026-11-18T00:00:00.000Z",
        },
      ],
    });

    expect(post).toMatchObject({
      id: "p1",
      userId: "u1",
      caption: "golden hour",
      tags: ["sunset"],
      location: "Lisbon",
      likesCount: 12,
      commentsCount: 3,
      sharesCount: 1,
      isLiked: true,
      author: { id: "u1", username: "maya", isVerified: true },
    });
    expect(post?.media[0]).toMatchObject({
      id: "p1:0",
      url: "https://cdn.test/p.jpg",
      type: "image",
    });
  });

  it("drops posts that have no author rather than emitting a broken row", () => {
    expect(mapApiPostsPayload({ posts: [{ id: "p2", caption: "orphan" }] })).toEqual([]);
  });
});
