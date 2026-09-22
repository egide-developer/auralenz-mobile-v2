import { create } from "zustand";

interface UnreadState {
  /** conversationId -> unread MESSAGE count in that chat (full count, e.g. 5) */
  messageUnread: Record<string, number>;
  /**
   * Number of chats with at least one unread message ("1 per chat"), not the
   * sum of raw message counts — this is what the tab badge shows. A chat
   * with 5 unread messages contributes 1 here, not 5.
   */
  totalUnread: number;
  setMessageUnread: (map: Record<string, number>) => void;
  setConversationUnread: (id: string, count: number) => void;
  incrementConversationUnread: (id: string) => void;
  clearConversationUnread: (id: string) => void;
}

const countUnreadChats = (map: Record<string, number>) =>
  Object.values(map).filter((count) => count > 0).length;

export const useUnreadStore = create<UnreadState>((set) => ({
  messageUnread: {},
  totalUnread: 0,

  setMessageUnread: (map) =>
    set({
      messageUnread: map,
      totalUnread: countUnreadChats(map),
    }),

  setConversationUnread: (id, count) =>
    set((s) => {
      const next = { ...s.messageUnread, [id]: Math.max(0, count) };
      if (next[id] === 0) delete next[id];
      return {
        messageUnread: next,
        totalUnread: countUnreadChats(next),
      };
    }),

  incrementConversationUnread: (id) =>
    set((s) => {
      const next = {
        ...s.messageUnread,
        [id]: (s.messageUnread[id] || 0) + 1,
      };
      return {
        messageUnread: next,
        totalUnread: countUnreadChats(next),
      };
    }),

  clearConversationUnread: (id) =>
    set((s) => {
      const next = { ...s.messageUnread };
      delete next[id];
      return {
        messageUnread: next,
        totalUnread: countUnreadChats(next),
      };
    }),
}));
