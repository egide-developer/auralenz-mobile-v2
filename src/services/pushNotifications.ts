import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { router } from "expo-router";
import api from "../api/client";
import { API } from "../api/endpoints";

// Since SDK 53, expo-notifications throws just from being imported when
// running inside Expo Go on Android (remote push was removed from Expo Go
// entirely) — a static top-level `import` would crash the whole app before
// it even renders. Everything here goes through a guarded dynamic import
// instead, so Expo Go / simulators degrade to "push just doesn't work"
// rather than a hard crash.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function loadNotifications() {
  if (isExpoGo) return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

let responseListenerAdded = false;

export async function initPushNotificationListeners() {
  if (responseListenerAdded) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  responseListenerAdded = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  Notifications.addNotificationResponseReceivedListener(() => {
    // Deep-linking to the exact post/conversation is left for a future
    // pass — the notifications screen already lists everything correctly,
    // so this is a safe, always-correct destination for a tapped push.
    router.push("/(modals)/notifications");
  });
}

let cachedToken: string | null = null;

export async function registerForPushNotifications() {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    // getExpoPushTokenAsync itself throws on a simulator/emulator without a
    // valid push service, so the try/catch below already covers that case
    // without needing expo-device.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    cachedToken = token;

    await api.post(API.users.pushToken, { token });
  } catch {
    // Push registration is best-effort — never block login/app start on it.
  }
}

export async function unregisterPushToken() {
  try {
    if (!cachedToken) return;
    await api.delete(API.users.pushToken, { data: { token: cachedToken } });
  } catch {
  } finally {
    cachedToken = null;
  }
}
