import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { BottomNav } from "../../src/components/layout/BottomNav";

export default function TabLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isDark = useThemeStore((s) => s.isDark);

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="search" options={{ title: "Search" }} />
        <Tabs.Screen name="messages" options={{ title: "Messages" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            href: null,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: "Create",
            href: null,
          }}
        />
      </Tabs>
      <BottomNav />
    </View>
  );
}
