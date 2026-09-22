// Keeps the global unread-chats count (bottom nav badge) in sync — mirrors
// frontend/src/components/layout/UnreadSync.tsx, mounted once alongside the
// tab bar so it tracks unread state regardless of which tab is active.
import { useEffect } from "react";
import api from "../../api/client";
import { API } from "../../api/endpoints";
import { useAuthStore } from "../../stores/authStore";
import { useUnreadStore } from "../../stores/unreadStore";
import { onNewMessage } from "../../services/socket";
import type { Conversation } from "../../types";

export function UnreadSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const setMessageUnread = useUnreadStore((s) => s.setMessageUnread);
  const incrementConversationUnread = useUnreadStore((s) => s.incrementConversationUnread);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(API.messages.conversations);
        const list: Conversation[] = data.data || data.conversations || data || [];
        if (!active) return;
        const map: Record<string, number> = {};
        for (const c of list) {
          if (c.unreadCount > 0) map[c.id] = c.unreadCount;
        }
        setMessageUnread(map);
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, setMessageUnread]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsubscribe = onNewMessage(({ message, conversationId }) => {
      if (message.senderId === userId) return;
      incrementConversationUnread(conversationId);
    });
    return unsubscribe;
  }, [isAuthenticated, userId, incrementConversationUnread]);

  return null;
}
