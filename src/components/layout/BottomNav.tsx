// AuraLenz BottomNav — mirrors web MobileNav.tsx
// Floating glass pill with 4 tabs + separate Create FAB
// Animated sliding active pill indicator
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../ui/Icon";
import { PlusSolid } from "../ui/icons/plus-solid";
import { useThemeStore } from "../../stores/themeStore";
import { useUnreadStore } from "../../stores/unreadStore";
import { Colors } from "../../theme/colors";
import { Radius } from "../../theme/spacing";

interface NavItem {
  name: string;
  icon: string;
  path: string;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "home", icon: "home", path: "/" },
  { name: "search", icon: "search", path: "/search" },
  { name: "messages", icon: "chat", path: "/messages", badge: true },
  { name: "profile", icon: "user", path: "/profile" },
];

const MAX_DOCK_WIDTH = 416;

const SPRING_CONFIG = { damping: 20, stiffness: 350, mass: 0.8 };

export function BottomNav() {
  const { width: screenWidth } = useWindowDimensions();
  const dockMaxWidth = Math.min(screenWidth - 20, MAX_DOCK_WIDTH);  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const totalUnread = useUnreadStore((s) => s.totalUnread);
  const isCreate = pathname.startsWith("/create");

  const [pillWidth, setPillWidth] = useState(0);
  const tabWidth = pillWidth > 0 ? pillWidth / NAV_ITEMS.length : 0;

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
  );
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  const indicatorX = useSharedValue(0);
  const fabRotation = useSharedValue(0);

  React.useEffect(() => {
    if (tabWidth > 0) {
      indicatorX.value = safeIndex * tabWidth;
    }
  }, [safeIndex, tabWidth]);

  React.useEffect(() => {
    fabRotation.value = withTiming(isCreate ? 135 : 0, { duration: 300 });
  }, [isCreate]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(indicatorX.value, SPRING_CONFIG) }],
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${fabRotation.value}deg` }],
  }));

  const onPillLayout = (e: LayoutChangeEvent) => {
    setPillWidth(e.nativeEvent.layout.width - 4); // minus paddingHorizontal*2
  };

  const handleCreate = () => {
    if (!isCreate) {
      router.push("/create");
      return;
    }
    router.back();
  };

    return (
    <View style={[styles.container, { paddingBottom: 8 + insets.bottom }]}>
      <View style={[styles.dockWrapper, { maxWidth: dockMaxWidth }]}>
        <View style={styles.dockRow}>
          {/* Main pill with 4 tabs */}
          <View
            onLayout={onPillLayout}
            style={[
              styles.pill,
              {
                borderColor: isDark ? Colors.dark.border + "99" : Colors.light.border + "99",
                backgroundColor: isDark ? Colors.dark.card + "D9" : Colors.light.card + "D9",
              },
            ]}
          >
            {/* Top hairline glow */}
            <View style={styles.hairlineGlow} />

            {/* Animated sliding indicator */}
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  styles.activeIndicator,
                  indicatorStyle,
                  {
                    width: tabWidth,
                    backgroundColor: isDark ? Colors.dark.primary + "12" : Colors.light.primary + "12",
                    borderColor: isDark ? Colors.dark.primary + "1A" : Colors.light.primary + "1A",
                  },
                ]}
              />
            )}

            {NAV_ITEMS.map((item) => {
              const isActive =
                item.path === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.path);
              return (
                <TabButton
                  key={item.path}
                  item={item}
                  isActive={isActive}
                  isDark={isDark}
                  unreadCount={item.badge ? totalUnread : 0}
                  onPress={() => router.push(item.path as any)}
                />
              );
            })}
          </View>

          {/* Create FAB */}
          <Animated.View style={fabStyle}>
            <TouchableOpacity
              onPress={handleCreate}
              activeOpacity={0.8}
              style={[
                styles.fab,
                {
                  backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
                  shadowColor: isDark ? Colors.dark.primary : Colors.light.primary,
                  shadowOpacity: isCreate ? 0.9 : 0.6,
                },
              ]}
            >
              <PlusSolid
                size={24}
                color={isDark ? Colors.dark.primaryForeground : Colors.light.primaryForeground}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function TabButton({
  item,
  isActive,
  isDark,
  unreadCount,
  onPress,
}: {
  item: NavItem;
  isActive: boolean;
  isDark: boolean;
  unreadCount: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.tabButton}
      accessibilityLabel={item.name}
    >
      <View style={styles.tabContent}>
        <Icon
          name={item.icon}
          set={isActive ? "bold" : "light"}
          size={21}
          color={
            isActive
              ? (isDark ? Colors.dark.primary : Colors.light.primary)
              : (isDark ? Colors.dark.mutedForeground : Colors.light.mutedForeground)
          }
        />

        {item.badge && unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary }]}>
            <Text style={[styles.badgeText, { color: isDark ? Colors.dark.primaryForeground : Colors.light.primaryForeground }]}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  dockWrapper: {
    width: "100%",
    paddingHorizontal: 10,
  },
  dockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 2,
    paddingVertical: 2,
    overflow: "hidden",
    position: "relative",
  },
  hairlineGlow: {
    position: "absolute",
    top: -0.5,
    left: 40,
    right: 40,
    height: 1,
    opacity: 0.5,
  },
  activeIndicator: {
    position: "absolute",
    top: 1,
    bottom: 1,
    left: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
});
