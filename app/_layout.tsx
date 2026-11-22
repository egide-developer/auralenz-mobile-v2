import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "../src/stores/authStore";
import { useThemeStore } from "../src/stores/themeStore";
import { Colors } from "../src/theme/colors";
import { CallListener } from "../src/components/layout/CallListener";
import { LocalDatabaseBootstrap } from "../src/components/layout/LocalDatabaseBootstrap";
import { SocketListener } from "../src/components/layout/SocketListener";
import { ToastHost } from "../src/components/ui/Toast";
import { initPushNotificationListeners } from "../src/services/pushNotifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadToken = useAuthStore((s) => s.loadToken);
  const isDark = useThemeStore((s) => s.isDark);
  const bg = isDark ? Colors.dark.background : Colors.light.background;

  const [fontsLoaded] = useFonts({
    "Urbanist-Regular": require("../assets/fonts/Urbanist-Regular.ttf"),
    "Urbanist-Medium": require("../assets/fonts/Urbanist-Medium.ttf"),
    "Urbanist-SemiBold": require("../assets/fonts/Urbanist-SemiBold.ttf"),
    "Urbanist-Bold": require("../assets/fonts/Urbanist-Bold.ttf"),
    // Typography.mono/monoSm referenced "SpaceMono-Regular" with no font
    // file and no registration here - it silently fell back to the system
    // default everywhere it was used (comment timestamps, mono numerals).
    "GeistMono-Regular": require("../assets/fonts/GeistMono-Regular.ttf"),
    "GeistMono-Medium": require("../assets/fonts/GeistMono-Medium.ttf"),
  });

  useEffect(() => {
    loadToken();
    initPushNotificationListeners();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <CallListener />
        <SocketListener />
        <LocalDatabaseBootstrap />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: bg },
          }}
        >
          <Stack.Screen
            name="(modals)"
            options={{
              presentation: "card",
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="profile/follow-list"
            options={{ animation: "slide_from_right" }}
          />
        </Stack>
        {/* Last child so toasts render above every screen in the stack. */}
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
