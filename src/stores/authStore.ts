import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import api, { TOKEN_KEY } from "../api/client";
import { API } from "../api/endpoints";
import { connectSocket, disconnectSocket } from "../services/socket";
import { useCallStore } from "./callStore";
import {
  registerForPushNotifications,
  unregisterPushToken,
} from "../services/pushNotifications";
import type { User } from "../types";

function connectSocketAndCallListeners() {
  connectSocket()
    .then(() => useCallStore.getState().initListeners())
    .catch(() => {});
  registerForPushNotifications();
}

function normalizeUser(raw: any): User | null {
  if (!raw) return null;
  return { ...raw, id: raw.id || raw._id };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ requiresTwoFactor?: boolean; challengeId?: string; methods?: Array<"email" | "totp">; email?: string }>;
  completeMfaLogin: (challengeId: string, code: string, method: "email" | "totp" | "recovery") => Promise<void>;
  claimLinkedDevice: (token: string, code: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  /** Merges fields into the cached user without a round trip, for callers that already have the server's response. */
  mergeUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const storeSession = async (response: any) => {
    const token = response.accessToken || response.token;
    const user = normalizeUser(response.user);
    if (!token || !user) throw new Error("The server returned an incomplete session");
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (response.refreshToken) {
      await SecureStore.setItemAsync("refresh_token", response.refreshToken);
    }
    set({ user, token, isAuthenticated: true });
    connectSocketAndCallListeners();
  };

  return ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const { data } = await api.get(API.auth.profile);
        const user = normalizeUser(data.user || data.data || data);
        set({ user, token, isAuthenticated: true, isLoading: false });
        connectSocketAndCallListeners();
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ isLoading: false });
    }
  },

  login: async (identifier, password) => {
    const trimmedIdentifier = identifier.trim();
    const credentials = trimmedIdentifier.startsWith("+")
      ? { phoneNumber: trimmedIdentifier.replace(/[()\s.-]/g, ""), password }
      : trimmedIdentifier.includes("@")
        ? { email: trimmedIdentifier, password }
        : { username: trimmedIdentifier, password };
    const { data } = await api.post(API.auth.login, credentials);
    const res = data.data || data;
    if (res.requiresTwoFactor) return res;
    await storeSession(res);
    return {};
  },

  completeMfaLogin: async (challengeId, code, method) => {
    const { data } = await api.post(API.auth.verifyMfa, { challengeId, code, method });
    await storeSession(data.data || data);
  },

  claimLinkedDevice: async (token, code) => {
    const { data } = await api.post(API.auth.claimDevice, { token, code });
    await storeSession(data.data || data);
  },

  register: async (username, email, password) => {
    const { data } = await api.post(API.auth.register, {
      username,
      email,
      password,
    });
    const res = data.data || data;
    const token = res.accessToken || res.token;
    const user = normalizeUser(res.user);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (res.refreshToken) {
      await SecureStore.setItemAsync("refresh_token", res.refreshToken);
    }
    set({ user, token, isAuthenticated: true });
    connectSocketAndCallListeners();
  },

  logout: async () => {
    await unregisterPushToken();
    try {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");
      await api.post(API.auth.logout, { refreshToken });
    } catch {}
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync("refresh_token");
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false });
    router.replace("/(auth)/login");
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put(API.auth.profile, profileData);
    const user = normalizeUser(data.user || data.data || data);
    set((s) => ({ user: { ...s.user!, ...user } }));
  },

  mergeUser: (data) => set((s) => (s.user ? { user: { ...s.user, ...data } } : {})),
  });
});
