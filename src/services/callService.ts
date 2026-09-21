import api from "../api/client";
import { API } from "../api/endpoints";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinConversation,
  leaveConversation,
  onNewMessage,
  onUnreadUpdate,
  onNotification,
  onTypingStart,
  onTypingStop,
  onCallInvite,
  removeListener,
} from "./socket";

class CallService {
  private conversationId: string | null = null;

  async init(token: string) {
    await connectSocket();

    onUnreadUpdate((unread) => {
      // The store will handle this via the component
    });

    onNotification((notification) => {
      // Handle push notification display
    });

    onCallInvite((data) => {
      this.conversationId = data.conversationId;
      // Navigation to incoming call screen will be handled by the app
    });
  }

  destroy() {
    disconnectSocket();
  }

  joinConvo(id: string) {
    joinConversation(id);
  }

  leaveConvo(id: string) {
    leaveConversation(id);
  }

  get isConnected() {
    return getSocket()?.connected ?? false;
  }
}

export const callService = new CallService();
