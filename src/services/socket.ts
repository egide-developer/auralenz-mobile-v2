import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "../api/endpoints";
import { TOKEN_KEY } from "../api/client";
import * as SecureStore from "expo-secure-store";
import Constants from 'expo-constants';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  let serverUrl = API_BASE_URL;
  
  // Enforce WSS in production
  if (Constants.expoConfig?.extra?.ENV === 'production' || process.env.NODE_ENV === 'production') {
    if (!serverUrl.startsWith('wss://') && !serverUrl.startsWith('https://')) {
      console.error('[Socket] Production environment requires WSS/HTTPS. Current URL:', serverUrl);
      throw new Error('WebSocket Secure (WSS) is required in production');
    }
  }
  
  // Convert HTTP to WS, HTTPS to WSS for WebSocket connections
  if (serverUrl.startsWith('http://')) {
    serverUrl = serverUrl.replace('http://', 'ws://');
  } else if (serverUrl.startsWith('https://')) {
    serverUrl = serverUrl.replace('https://', 'wss://');
  }

  socket = io(serverUrl, {
    // Use a function to get fresh token on each connection/reconnection attempt
    auth: async () => ({
      token: await SecureStore.getItemAsync(TOKEN_KEY),
    }),
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

// Joining the group room is what makes the server's group-scoped broadcasts
// reachable — group typing indicators and AI message updates are both sent
// to `group_<id>` and are silently lost by any client that never joins.
export function joinGroup(groupId: string) {
  socket?.emit("join_group", groupId);
}

export function leaveGroup(groupId: string) {
  socket?.emit("leave_group", groupId);
}

export function startGroupTyping(groupId: string) {
  socket?.emit("group_typing_start", { groupId });
}

export function stopGroupTyping(groupId: string) {
  socket?.emit("group_typing_stop", { groupId });
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

/**
 * Server-side rejections arrive here: an unauthorized room join, or a message
 * to someone who has blocked you. Without a listener these fail silently and
 * the user is left looking at a tap that did nothing.
 */
export function onSocketError(callback: (data: { message: string }) => void) {
  socket?.on("error", callback);
  return () => {
    socket?.off("error", callback);
  };
}

export function onUserStatusChange(
  callback: (data: { userId: string; isOnline: boolean; lastSeen: string | null }) => void
) {
  socket?.on("user_status_change", callback);
  return () => {
    socket?.off("user_status_change", callback);
  };
}

export function onMessageUpdated(callback: (data: { message: any; conversationId?: string; groupId?: string }) => void) {
  socket?.on("message_updated", callback);
  return () => {
    socket?.off("message_updated", callback);
  };
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

export function onGroupTypingStart(callback: (data: { userId: string; groupId: string }) => void) {
  socket?.on("group_typing_start", callback);
  return () => {
    socket?.off("group_typing_start", callback);
  };
}

export function onGroupTypingStop(callback: (data: { userId: string; groupId: string }) => void) {
  socket?.on("group_typing_stop", callback);
  return () => {
    socket?.off("group_typing_stop", callback);
  };
}

/**
 * The group lifecycle family. The server broadcasts each of these on any
 * group mutation; without listeners the UI only reflects a change after a
 * manual refresh.
 */
export type GroupLifecycleEvent =
  | "group_created"
  | "group_updated"
  | "group_deleted"
  | "group_removed"
  | "group_avatar_updated"
  | "group_participants_added"
  | "group_participant_removed"
  | "group_role_updated";

export function onGroupLifecycle(
  events: GroupLifecycleEvent[],
  callback: (event: GroupLifecycleEvent, data: any) => void
) {
  const handlers = events.map((event) => {
    const handler = (data: any) => callback(event, data);
    socket?.on(event, handler);
    return { event, handler };
  });
  return () => {
    handlers.forEach(({ event, handler }) => socket?.off(event, handler));
  };
}

export function onNotification(callback: (notification: any) => void) {
  socket?.on("notification", callback);
  return () => {
    socket?.off("notification", callback);
  };
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

/** Every call-signalling failure path on the server reports through this. */
export function onCallError(callback: (data: { message: string; event?: string }) => void) {
  socket?.on("call_error", callback);
  return () => {
    socket?.off("call_error", callback);
  };
}

export function removeListener(event: string) {
  socket?.off(event);
}

// ─── Live Rooms (WebRTC mesh) ────────────────────────────────
// Room management is REST (/api/live-rooms). These handlers only cover
// the mesh signaling relay. The server validates room membership for every
// signal relay, so clients need only join via REST first.
export interface LiveRoomPeer {
  id: string;
  userId?: string;
  username?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface LiveRoomSignalPayload {
  roomId: string;
  fromUserId: string;
  [key: string]: any;
}

export function joinLiveRoomSocket(roomId: string) {
  socket?.emit("live_join", { roomId });
}

export function leaveLiveRoomSocket(roomId: string) {
  socket?.emit("live_leave", { roomId });
}

export function sendLiveOffer(data: { roomId: string; toUserId: string; sdp: any }) {
  socket?.emit("live_offer", data);
}

export function sendLiveAnswer(data: { roomId: string; toUserId: string; sdp: any }) {
  socket?.emit("live_answer", data);
}

export function sendLiveIce(data: { roomId: string; toUserId: string; candidate: any }) {
  socket?.emit("live_ice", data);
}

export function onLivePeers(callback: (data: { roomId: string; peers: LiveRoomPeer[] }) => void) {
  socket?.on("live_peers", callback);
  return () => socket?.off("live_peers", callback);
}

export function onLivePeerJoined(callback: (data: { roomId: string; peer: LiveRoomPeer; userId: string }) => void) {
  socket?.on("live_peer_joined", callback);
  return () => socket?.off("live_peer_joined", callback);
}

export function onLivePeerLeft(callback: (data: { roomId: string; userId: string }) => void) {
  socket?.on("live_peer_left", callback);
  return () => socket?.off("live_peer_left", callback);
}

export function onLiveOffer(callback: (data: LiveRoomSignalPayload & { sdp: any }) => void) {
  socket?.on("live_offer", callback);
  return () => socket?.off("live_offer", callback);
}

export function onLiveAnswer(callback: (data: LiveRoomSignalPayload & { sdp: any }) => void) {
  socket?.on("live_answer", callback);
  return () => socket?.off("live_answer", callback);
}

export function onLiveIce(callback: (data: LiveRoomSignalPayload & { candidate: any }) => void) {
  socket?.on("live_ice", callback);
  return () => socket?.off("live_ice", callback);
}

export function onLiveError(callback: (data: { message: string; event?: string }) => void) {
  socket?.on("live_error", callback);
  return () => socket?.off("live_error", callback);
}

export function onLiveEnded(callback: (data: { roomId: string }) => void) {
  socket?.on("live_ended", callback);
  return () => socket?.off("live_ended", callback);
}
