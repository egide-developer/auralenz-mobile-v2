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
export function joinConversation(conversationId: string) {
  socket?.emit("join:conversation", { conversationId });
}

export function leaveConversation(conversationId: string) {
  socket?.emit("leave:conversation", { conversationId });
}

export function sendMessage(conversationId: string, content: string) {
  socket?.emit("message:send", { conversationId, content });
}

export function startTyping(conversationId: string) {
  socket?.emit("typing:start", { conversationId });
}

export function stopTyping(conversationId: string) {
  socket?.emit("typing:stop", { conversationId });
}

export function markRead(conversationId: string) {
  socket?.emit("message:read", { conversationId });
}

// ─── Event Listeners ───────────────────────────────────────
export function onNewMessage(callback: (message: any) => void) {
  socket?.on("message:new", callback);
}

export function onTypingStart(callback: (data: { userId: string; conversationId: string }) => void) {
  socket?.on("typing:start", callback);
}

export function onTypingStop(callback: (data: { userId: string; conversationId: string }) => void) {
  socket?.on("typing:stop", callback);
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
