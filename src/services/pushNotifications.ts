import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import api from "../api/client";
import { API } from "../api/endpoints";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let responseListenerAdded = false;

export function initPushNotificationListeners() {
  if (responseListenerAdded) return;
  responseListenerAdded = true;
  Notifications.addNotificationResponseReceivedListener(() => {
    // Deep-linking to the exact post/conversation is left for a future
    // pass — the notifications screen already lists everything correctly,
    // so this is a safe, always-correct destination for a tapped push.
    router.push("/(modals)/notifications");
  });
}

let cachedToken: string | null = null;

export async function registerForPushNotifications() {
  try {
    // expo-notifications' getExpoPushTokenAsync itself throws on a
    // simulator/emulator without a valid push service, so the try/catch
    // below already covers that case without needing expo-device.
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
