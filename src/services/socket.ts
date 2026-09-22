import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../api/endpoints";
import { TOKEN_KEY } from "../api/client";
import * as SecureStore from "expo-secure-store";

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("[Socket] Connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// ─── Event Emitters ────────────────────────────────────────
// Payload/event names below are dictated by backend/services/socketService.js —
// keep them in sync with that file, not with convention.
export function joinConversation(conversationId: string) {
  socket?.emit("join_conversation", conversationId);
}

export function leaveConversation(conversationId: string) {
  socket?.emit("leave_conversation", conversationId);
}

export function startTyping(conversationId: string) {
  socket?.emit("typing_start", { conversationId });
}

export function stopTyping(conversationId: string) {
  socket?.emit("typing_stop", { conversationId });
}

export function markRead(conversationId: string) {
  socket?.emit("mark_read", { conversationId });
}

// ─── Event Listeners ───────────────────────────────────────
// Each returns an unsubscribe function so multiple screens can listen to the
// same event concurrently without stepping on each other's listeners.
export function onNewMessage(callback: (data: { message: any; conversationId: string }) => void) {
  socket?.on("new_message", callback);
  return () => {
    socket?.off("new_message", callback);
  };
}

export function onMessagesRead(
  callback: (data: { conversationId: string; readBy: string; messageIds: string[] }) => void
) {
  socket?.on("messages_read", callback);
  return () => {
    socket?.off("messages_read", callback);
  };
}

export function onTypingStart(callback: (data: { userId: string; conversationId: string }) => void) {
  socket?.on("typing_start", callback);
  return () => {
    socket?.off("typing_start", callback);
  };
}

export function onTypingStop(callback: (data: { userId: string; conversationId: string }) => void) {
  socket?.on("typing_stop", callback);
  return () => {
    socket?.off("typing_stop", callback);
  };
}

export function onUnreadUpdate(callback: (data: Record<string, number>) => void) {
  socket?.on("unread:update", callback);
}

export function onNotification(callback: (notification: any) => void) {
  socket?.on("notification", callback);
}

export function onCallInvite(callback: (data: { conversationId: string; callerId: string; callerName: string; type: string }) => void) {
  socket?.on("call:invite", callback);
}

export function onCallAccept(callback: (data: { conversationId: string; peerId: string }) => void) {
  socket?.on("call:accept", callback);
}

export function onCallDecline(callback: (data: { conversationId: string }) => void) {
  socket?.on("call:decline", callback);
}

export function onCallEnd(callback: (data: { conversationId: string }) => void) {
  socket?.on("call:end", callback);
}

// ─── Signal Events (WebRTC) ────────────────────────────────
export function sendSignal(peerId: string, signal: any) {
  socket?.emit("signal", { peerId, signal });
}

export function onSignal(callback: (data: { peerId: string; signal: any }) => void) {
  socket?.on("signal", callback);
}

export function removeListener(event: string) {
  socket?.off(event);
}
