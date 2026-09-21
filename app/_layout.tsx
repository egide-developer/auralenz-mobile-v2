import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "../src/stores/authStore";
import { useThemeStore } from "../src/stores/themeStore";
import { Colors } from "../src/theme/colors";

export default function RootLayout() {
  const loadToken = useAuthStore((s) => s.loadToken);
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    loadToken();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
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
    </GestureHandlerRootView>
  );
}
