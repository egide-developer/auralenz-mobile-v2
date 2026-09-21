import { create } from "zustand";

interface UnreadState {
  messageUnread: Record<string, number>;
  totalUnread: number;
  setMessageUnread: (map: Record<string, number>) => void;
  setConversationUnread: (id: string, count: number) => void;
  incrementConversationUnread: (id: string) => void;
  clearConversationUnread: (id: string) => void;
}

export const useUnreadStore = create<UnreadState>((set) => ({
  messageUnread: {},
  totalUnread: 0,

  setMessageUnread: (map) =>
    set({
      messageUnread: map,
      totalUnread: Object.values(map).reduce((s, c) => s + c, 0),
    }),

  setConversationUnread: (id, count) =>
    set((s) => {
      const next = { ...s.messageUnread, [id]: Math.max(0, count) };
      return {
        messageUnread: next,
        totalUnread: Object.values(next).reduce((a, b) => a + b, 0),
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
        totalUnread: Object.values(next).reduce((a, b) => a + b, 0),
      };
    }),

  clearConversationUnread: (id) =>
    set((s) => {
      const next = { ...s.messageUnread };
      delete next[id];
      return {
        messageUnread: next,
        totalUnread: Object.values(next).reduce((a, b) => a + b, 0),
      };
    }),
}));
