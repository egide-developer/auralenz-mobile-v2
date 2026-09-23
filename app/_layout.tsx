import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from "@expo-google-fonts/urbanist";
import { useAuthStore } from "../src/stores/authStore";
import { useThemeStore } from "../src/stores/themeStore";
import { Colors } from "../src/theme/colors";
import { CallListener } from "../src/components/layout/CallListener";
import { initPushNotificationListeners } from "../src/services/pushNotifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadToken = useAuthStore((s) => s.loadToken);
  const isDark = useThemeStore((s) => s.isDark);

  const [fontsLoaded] = useFonts({
    "Urbanist-Regular": Urbanist_400Regular,
    "Urbanist-Medium": Urbanist_500Medium,
    "Urbanist-SemiBold": Urbanist_600SemiBold,
    "Urbanist-Bold": Urbanist_700Bold,
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <CallListener />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: isDark
                ? Colors.dark.background
                : Colors.light.background,
            },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
