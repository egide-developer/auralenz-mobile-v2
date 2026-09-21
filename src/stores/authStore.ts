import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import api, { TOKEN_KEY } from "../api/client";
import { API } from "../api/endpoints";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const { data } = await api.get(API.auth.profile);
        const user = data.data || data;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post(API.auth.login, { email, password });
    const res = data.data || data;
    const token = res.accessToken || res.token;
    const user = res.user;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (res.refreshToken) {
      await SecureStore.setItemAsync("refresh_token", res.refreshToken);
    }
    set({ user, token, isAuthenticated: true });
  },

  register: async (username, email, password) => {
    const { data } = await api.post(API.auth.register, {
      username,
      email,
      password,
    });
    const res = data.data || data;
    const token = res.accessToken || res.token;
    const user = res.user;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (res.refreshToken) {
      await SecureStore.setItemAsync("refresh_token", res.refreshToken);
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post(API.auth.logout);
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put(API.auth.profile, profileData);
    const user = data.data || data;
    set((s) => ({ user: { ...s.user!, ...user } }));
  },
}));
