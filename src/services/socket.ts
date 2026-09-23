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

// ─── Group chat ────────────────────────────────────────────
export function markGroupRead(groupId: string) {
  socket?.emit("group_mark_read", { groupId });
}

export function onNewGroupMessage(callback: (data: { message: any; groupId: string }) => void) {
  socket?.on("new_group_message", callback);
  return () => {
    socket?.off("new_group_message", callback);
  };
}

export function onNotification(callback: (notification: any) => void) {
  socket?.on("notification", callback);
}

// ─── Call signaling (WebRTC) ───────────────────────────────
// Backend just relays these to the other participant's user room
// (services/socketService.js#handleCallSignal) and stamps on fromUserId /
// fromUser — it never inspects sdp/candidate, so payload shapes below only
// need to match what the mobile client itself sends and reads.
export interface CallSignalPayload {
  conversationId: string;
  callId: string;
  fromUserId?: string;
  fromUser?: { id: string; username: string; avatarUrl?: string };
  [key: string]: any;
}

export function sendCallOffer(data: { conversationId: string; callId: string; kind: "audio" | "video"; sdp: any }) {
  socket?.emit("call_offer", data);
}

export function sendCallAnswer(data: { conversationId: string; callId: string; sdp: any }) {
  socket?.emit("call_answer", data);
}

export function sendCallIce(data: { conversationId: string; callId: string; candidate: any }) {
  socket?.emit("call_ice", data);
}

export function sendCallEnd(data: { conversationId: string; callId: string }) {
  socket?.emit("call_end", data);
}

export function sendCallDecline(data: { conversationId: string; callId: string; reason?: string }) {
  socket?.emit("call_decline", data);
}

export function onCallOffer(callback: (data: CallSignalPayload & { kind: "audio" | "video"; sdp: any }) => void) {
  socket?.on("call_offer", callback);
  return () => {
    socket?.off("call_offer", callback);
  };
}

export function onCallAnswer(callback: (data: CallSignalPayload & { sdp: any }) => void) {
  socket?.on("call_answer", callback);
  return () => {
    socket?.off("call_answer", callback);
  };
}

export function onCallIce(callback: (data: CallSignalPayload & { candidate: any }) => void) {
  socket?.on("call_ice", callback);
  return () => {
    socket?.off("call_ice", callback);
  };
}

export function onCallEnd(callback: (data: CallSignalPayload) => void) {
  socket?.on("call_end", callback);
  return () => {
    socket?.off("call_end", callback);
  };
}

export function onCallDecline(callback: (data: CallSignalPayload & { reason?: string }) => void) {
  socket?.on("call_decline", callback);
  return () => {
    socket?.off("call_decline", callback);
  };
}

export function removeListener(event: string) {
  socket?.off(event);
}
