import { create } from "zustand";

export type ToastKind = "error" | "info" | "success";

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, kind?: ToastKind) => void;
  dismiss: (id: string) => void;
}

const VISIBLE_MS = 3200;
const MAX_VISIBLE = 3;

let counter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, kind = "info") => {
    // A flapping socket can emit the same error repeatedly; showing it once
    // is informative, showing it eight times is just noise.
    if (get().toasts.some((t) => t.message === message)) return;

    const id = `toast-${++counter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }].slice(-MAX_VISIBLE) }));
    setTimeout(() => get().dismiss(id), VISIBLE_MS);
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Callable outside React — stores and socket handlers have no hooks. */
export const showToast = (message: string, kind: ToastKind = "info") =>
  useToastStore.getState().show(message, kind);
