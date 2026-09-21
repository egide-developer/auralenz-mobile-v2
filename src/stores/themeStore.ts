import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: true,
  toggle: () => set((s) => ({ isDark: !s.isDark })),
  setDark: (v) => set({ isDark: v }),
}));
