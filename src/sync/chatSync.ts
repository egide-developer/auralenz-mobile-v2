import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { AppState } from "react-native";
import { API } from "../api/endpoints";
import api from "../api/client";
import { useUnreadStore } from "../stores/unreadStore";
import {
  incrementConversationUnreadLocally,
  listConversations,
  markConversationReadLocally,
  upsertConversations,
} from "../repositories/conversations";
import {
  upsertMessages,
  cleanupAllConversations,
} from "../repositories/messages";
import {
  extractConversationPayloads,
  mapConversationPayload,
} from "../repositories/chatMappers";
import { enqueueMarkRead } from "./messageQueue";
import { getNextOutboxRetryAt } from "../repositories/outbox";
import { processOutboxQueue } from "./outboxProcessor";
import {
  connectSocket,
  getSocket,
  isConversationJoined,
} from "../services/socket";
import { setSyncCursor } from "./cursorStore";
import { useSyncStatusStore } from "./statusStore";
import {
  applyMessageDeletedEvent,
  applyMessagePageDelta,
  applyMessageUpdatedEvent,
  applyMessagesReadEvent,
  applyNewMessageEvent,
} from "./messageEvents";
import { cleanupSearchCache } from "../repositories/search";
import { cleanupOrphanedOutboxAttachments } from "../repositories/outbox";

interface UserSyncSession {
  userId: string;
  stopped: boolean;
  networkOnline: boolean;
  socketConnected: boolean;
  outboxFlight: Promise<void> | null;
  outboxTimer: ReturnType<typeof setTimeout> | null;
  resourceFlights: Map<string, Promise<void>>;
  cleanup: Array<() => void>;
}

const sessions = new Map<string, UserSyncSession>();

function markConnected(session: UserSyncSession, connected: boolean): void {
  session.socketConnected = connected;
  useSyncStatusStore.getState().setSocketConnected(connected);
}

function markNetwork(session: UserSyncSession, online: boolean): void {
  session.networkOnline = online;
  useSyncStatusStore.getState().setNetworkOnline(online);
}

function runResource(
  session: UserSyncSession,
  resourceKey: string,
  task: () => Promise<void>,
): Promise<void> {
  const existing = session.resourceFlights.get(resourceKey);
  if (existing) return existing;

  const flight = task().finally(() => {
    if (session.resourceFlights.get(resourceKey) === flight) {
      session.resourceFlights.delete(resourceKey);
    }
  });
  session.resourceFlights.set(resourceKey, flight);
  return flight;
}

async function syncConversationPage(
  session: UserSyncSession,
  conversationId: string,
): Promise<void> {
  await runResource(session, `messages:${conversationId}`, async () => {
    const { data } = await api.get<unknown>(
      API.messages.messages(conversationId),
      { params: { page: 1, limit: 20 } },
    );
    await applyMessagePageDelta(session.userId, conversationId, data);
    try {
      setSyncCursor(
        session.userId,
        `messages:${conversationId}`,
        new Date().toISOString(),
      );
    } catch (error) {
      console.warn("[ChatSync] Could not persist the local message cursor", error);
    }
  });
}

async function syncAllChats(session: UserSyncSession): Promise<void> {
  if (!session.networkOnline || session.stopped) return;

  await runResource(session, "conversations", async () => {
    const { data } = await api.get<unknown>(API.messages.conversations);
    const mapped = extractConversationPayloads(data).flatMap((payload) => {
      const item = mapConversationPayload(payload, session.userId);
      return item ? [item] : [];
    });
    await upsertMessages(
      session.userId,
      mapped.flatMap(({ preview }) => (preview ? [preview] : [])),
    );
    await upsertConversations(
      session.userId,
      mapped.map(({ conversation }) => conversation),
    );
    try {
      setSyncCursor(
        session.userId,
        "conversations",
        new Date().toISOString(),
      );
    } catch (error) {
      console.warn("[ChatSync] Could not persist the conversation cursor", error);
    }
  }).catch((error: unknown) => {
    console.error("[ChatSync] Conversation refresh failed", error);
  });

  if (session.stopped || !session.networkOnline) return;
  try {
    const conversations = await listConversations(session.userId);
    for (const conversation of conversations) {
      if (session.stopped || !session.networkOnline) break;
      try {
        await syncConversationPage(session, conversation.id);
      } catch (error) {
        console.error(
          `[ChatSync] Message catch-up failed for ${conversation.id}`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("[ChatSync] Could not read cached conversations", error);
  }
}

async function handleNewMessage(
  session: UserSyncSession,
  value: unknown,
): Promise<void> {
  const mapped = await applyNewMessageEvent(session.userId, value);
  if (!mapped) {
    console.error("[ChatSync] Ignored an invalid new_message payload");
    return;
  }

  await upsertMessages(session.userId, [mapped]);
  if (mapped.senderId === session.userId) return;

  if (isConversationJoined(mapped.conversationId)) {
    await markConversationReadLocally(session.userId, mapped.conversationId);
    useUnreadStore.getState().clearConversationUnread(mapped.conversationId);
    await enqueueMarkRead(session.userId, mapped.conversationId);
    requestOutboxDrain(session.userId);
    return;
  }

  const unreadCount = await incrementConversationUnreadLocally(
    session.userId,
    mapped.conversationId,
  );
  useUnreadStore.getState().setConversationUnread(mapped.conversationId, unreadCount);
}

async function handleMessageUpdate(
  session: UserSyncSession,
  value: unknown,
): Promise<void> {
  await applyMessageUpdatedEvent(session.userId, value);
}

async function handleMessageDeleted(
  session: UserSyncSession,
  value: unknown,
): Promise<void> {
  await applyMessageDeletedEvent(session.userId, value);
}

async function handleMessagesRead(
  session: UserSyncSession,
  value: unknown,
): Promise<void> {
  await applyMessagesReadEvent(session.userId, value);
}

export async function requestOutboxDrain(userId: string): Promise<void> {
  const session = sessions.get(userId);
  if (!session || session.stopped || !session.networkOnline) return;
  if (session.outboxFlight) return session.outboxFlight;
  if (session.outboxTimer) {
    clearTimeout(session.outboxTimer);
    session.outboxTimer = null;
  }

  const flight = processOutboxQueue(userId)
    .catch((error: unknown) => {
      console.error("[Outbox] Queue processing failed", error);
    })
    .finally(() => {
      if (session.outboxFlight === flight) session.outboxFlight = null;
      void scheduleOutboxRetry(session);
    });
  session.outboxFlight = flight;
  return flight;
}

async function scheduleOutboxRetry(session: UserSyncSession): Promise<void> {
  if (session.stopped || !session.networkOnline || session.outboxTimer) return;
  try {
    const nextRetryAt = await getNextOutboxRetryAt(session.userId);
    if (session.stopped || !session.networkOnline) return;
    if (!nextRetryAt) return;
    const delay = Math.max(0, new Date(nextRetryAt).getTime() - Date.now());
    session.outboxTimer = setTimeout(() => {
      session.outboxTimer = null;
      void requestOutboxDrain(session.userId);
    }, delay);
  } catch (error) {
    console.error("[Outbox] Could not schedule the next retry", error);
  }
}

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function runPeriodicCleanup(userId: string): Promise<void> {
  try {
    await cleanupAllConversations(userId);
  } catch (error) {
    console.warn("[ChatSync] Message cleanup failed", error);
  }
  try {
    await cleanupSearchCache(userId);
  } catch (error) {
    console.warn("[ChatSync] Search cache cleanup failed", error);
  }
  try {
    await cleanupOrphanedOutboxAttachments(userId);
  } catch (error) {
    console.warn("[ChatSync] Outbox attachment cleanup failed", error);
  }
}

export async function startUserSync(userId: string): Promise<void> {
  if (sessions.has(userId)) return;
  const session: UserSyncSession = {
    userId,
    stopped: false,
    networkOnline: true,
    socketConnected: false,
    outboxFlight: null,
    outboxTimer: null,
    resourceFlights: new Map(),
    cleanup: [],
  };
  sessions.set(userId, session);

  await runPeriodicCleanup(userId);

  try {
    const network = await getNetworkStateAsync();
    markNetwork(
      session,
      network.isConnected !== false && network.isInternetReachable !== false,
    );
  } catch (error) {
    console.warn("[ChatSync] Initial network state is unavailable", error);
  }
  if (session.stopped) return;

  const networkSubscription = addNetworkStateListener((network) => {
    const wasOnline = session.networkOnline;
    const online =
      network.isConnected !== false && network.isInternetReachable !== false;
    markNetwork(session, online);
    if (online && !wasOnline) {
      void syncAllChats(session);
      void requestOutboxDrain(userId);
    }
  });
  session.cleanup.push(() => networkSubscription.remove());

  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active" && session.networkOnline) {
      void syncAllChats(session);
      void requestOutboxDrain(userId);
    }
  });
  session.cleanup.push(() => appStateSubscription.remove());

  const cleanupTimer = setInterval(() => {
    if (!session.stopped) {
      void runPeriodicCleanup(userId);
    }
  }, CLEANUP_INTERVAL_MS);
  session.cleanup.push(() => clearInterval(cleanupTimer));

  try {
    await connectSocket();
  } catch (error) {
    console.warn("[ChatSync] Socket connection could not be started", error);
  }
  if (session.stopped) return;

  const socket = getSocket();
  if (socket) {
    const onConnect = () => {
      markConnected(session, true);
      void syncAllChats(session);
      void requestOutboxDrain(userId);
    };
    const onDisconnect = () => markConnected(session, false);
    const onNew = (value: unknown) => {
      void handleNewMessage(session, value).catch((error: unknown) => {
        console.error("[ChatSync] Failed to apply new_message", error);
      });
    };
    const onUpdate = (value: unknown) => {
      void handleMessageUpdate(session, value).catch((error: unknown) => {
        console.error("[ChatSync] Failed to apply message_updated", error);
      });
    };
    const onDelete = (value: unknown) => {
      void handleMessageDeleted(session, value).catch((error: unknown) => {
        console.error("[ChatSync] Failed to apply message deletion", error);
      });
    };
    const onRead = (value: unknown) => {
      void handleMessagesRead(session, value).catch((error: unknown) => {
        console.error("[ChatSync] Failed to apply messages_read", error);
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNew);
    socket.on("message_updated", onUpdate);
    socket.on("message_deleted", onDelete);
    socket.on("message.deleted", onDelete);
    socket.on("messages_read", onRead);
    session.cleanup.push(() => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNew);
      socket.off("message_updated", onUpdate);
      socket.off("message_deleted", onDelete);
      socket.off("message.deleted", onDelete);
      socket.off("messages_read", onRead);
    });

    markConnected(session, socket.connected);
    if (socket.connected) {
      void syncAllChats(session);
      void requestOutboxDrain(userId);
    }
  }

  void requestOutboxDrain(userId);
}

export async function stopUserSync(userId: string): Promise<void> {
  const session = sessions.get(userId);
  if (!session) return;
  session.stopped = true;
  sessions.delete(userId);
  if (session.outboxTimer) clearTimeout(session.outboxTimer);
  session.cleanup.forEach((cleanup) => cleanup());
  if (session.outboxFlight) await session.outboxFlight;
  await Promise.allSettled([...session.resourceFlights.values()]);
  session.resourceFlights.clear();
  markConnected(session, false);
  markNetwork(session, false);

  try {
    const { Directory, Paths } = await import("expo-file-system");
    const directory = new Directory(Paths.document, "message-outbox", encodeURIComponent(userId));
    if (directory.exists) {
      directory.delete();
    }
  } catch (error) {
    console.warn("[ChatSync] Failed to delete outbox directory on logout", error);
  }
}
