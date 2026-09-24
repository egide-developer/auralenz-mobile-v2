import { create } from "zustand";

interface PresenceEntry {
  isOnline: boolean;
  lastSeen: string | null;
}

interface PresenceState {
  /** userId -> live presence, kept current by the `user_status_change` socket event. */
  presence: Record<string, PresenceEntry>;
  setPresence: (userId: string, entry: PresenceEntry) => void;
  /** Seeds from a REST payload so a screen isn't blank until the first socket event. */
  seed: (entries: Record<string, PresenceEntry>) => void;
  isOnline: (userId?: string | null) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presence: {},

  setPresence: (userId, entry) =>
    set((s) => ({ presence: { ...s.presence, [userId]: entry } })),

  seed: (entries) =>
    set((s) => ({ presence: { ...entries, ...s.presence } })),

  isOnline: (userId) => (userId ? get().presence[userId]?.isOnline === true : false),
}));
