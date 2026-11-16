// AuraLenz BottomNav — active tab has sliding pill + filled icon only
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
  Keyboard,
  Platform,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Icon } from "../ui/Icon";
import { PlusSolid } from "../ui/icons/plus-solid";
import { useThemeStore } from "../../stores/themeStore";
import { useUnreadStore } from "../../stores/unreadStore";
import { Colors } from "../../theme/colors";
import { Radius, Spacing, Gap } from "../../theme/spacing";
import { FontFamily } from "../../theme/typography";

interface NavItem {
  name: string;
  icon: string;
  path: string;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "home", icon: "home", path: "/" },
  { name: "search", icon: "search", path: "/search" },
  { name: "reels", icon: "play", path: "/reels" },
  { name: "messages", icon: "chat", path: "/messages", badge: true },
  { name: "profile", icon: "user", path: "/profile" },
];

const MAX_DOCK_WIDTH = 416;
const INDICATOR_SPRING = { damping: 36, stiffness: 400, overshootClamping: true };

function normalizePathname(pathname: string) {
  return pathname.replace(/\/\([^)]+\)/g, "") || "/";
}

export function BottomNav() {
  const { width: screenWidth } = useWindowDimensions();
  const dockMaxWidth = Math.min(screenWidth - 20, MAX_DOCK_WIDTH);
  const pathname = usePathname();
  const normalizedPathname = normalizePathname(pathname);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeIsDark = useThemeStore((s) => s.isDark);
  const totalUnread = useUnreadStore((s) => s.totalUnread);
  const isCreate = normalizedPathname.startsWith("/create");
  const isReelsTab = normalizedPathname === "/reels";
  const isDark = isReelsTab || themeIsDark;

  const [pillWidth, setPillWidth] = useState(0);
  const tabWidth = pillWidth > 0 ? pillWidth / NAV_ITEMS.length : 0;

  // Compute active index from pathname
  const activeIndex = React.useMemo(() => {
    return NAV_ITEMS.findIndex((item) => {
      if (item.path === "/") {
        return normalizedPathname === "/" || normalizedPathname === "/index";
      }
      return (
        normalizedPathname === item.path ||
        normalizedPathname.startsWith(`${item.path}/`)
      );
    });
  }, [normalizedPathname]);

  const indicatorX = useSharedValue(0);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  // Animate indicator on mount and when activeIndex/tabWidth changes
  React.useEffect(() => {
    if (tabWidth > 0 && activeIndex >= 0) {
      indicatorX.value = withSpring(activeIndex * tabWidth, INDICATOR_SPRING);
    } else if (activeIndex >= 0) {
      indicatorX.value = activeIndex * (screenWidth / NAV_ITEMS.length);
    }
  }, [activeIndex, tabWidth, screenWidth]);

  const keyboardY = useSharedValue(0);
  const keyboardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: keyboardY.value }],
  }));

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      keyboardY.value = withTiming(e.endCoordinates.height, { duration: 250 });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardY.value = withTiming(0, { duration: 250 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onPillLayout = (e: LayoutChangeEvent) => {
    setPillWidth(Math.max(0, e.nativeEvent.layout.width - Spacing.xs * 2));
  };

  const handleCreate = () => {
    if (!isCreate) {
      router.push("/create");
      return;
    }
    router.back();
  };

  const c = isDark ? Colors.dark : Colors.light;
  const bg = isDark ? Colors.dark.background : Colors.light.background;
  const primary = isDark ? Colors.dark.primary : Colors.light.primary;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        keyboardStyle,
        { paddingBottom: insets.bottom, backgroundColor: bg },
      ]}
    >
      <View style={[styles.dockWrapper, { maxWidth: dockMaxWidth }]}>
        <View style={styles.dockRow}>
          {/* Main pill with 5 tabs */}
          <View style={styles.pillShadowWrap}>
            <View onLayout={onPillLayout} style={[styles.pill, { backgroundColor: c.card }]}>
              <BlurView
                intensity={isDark ? 30 : 40}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />

              {/* Visible border on pill */}
              <View style={[styles.pillBorder, { borderColor: c.border }]} />

              {/* Sliding active pill background */}
              {tabWidth > 0 && activeIndex >= 0 && (
                <Animated.View
                  style={[
                    styles.activePill,
                    {
                      width: tabWidth,
                      backgroundColor: primary + "33",
                    },
                    indicatorStyle,
                  ]}
                />
              )}

              {NAV_ITEMS.map((item, index) => {
                const isActive = activeIndex === index;
                return (
                  <TabItem
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    isDark={isDark}
                    unreadCount={item.badge ? totalUnread : 0}
                    onPress={() => router.navigate(item.path)}
                    index={index}
                    tabWidth={tabWidth}
                  />
                );
              })}
            </View>
          </View>

          {/* Create FAB */}
          <TouchableOpacity
            onPress={handleCreate}
            activeOpacity={0.85}
            style={[
              styles.fab,
              { backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary },
            ]}
          >
            <PlusSolid
              size={24}
              color={isDark ? Colors.dark.primaryForeground : Colors.light.primaryForeground}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

interface TabItemProps {
  item: NavItem;
  isActive: boolean;
  isDark: boolean;
  unreadCount: number;
  onPress: () => void;
  index: number;
  tabWidth: number;
}

function TabItem({
  item,
  isActive,
  isDark,
  unreadCount,
  onPress,
  index,
  tabWidth,
}: TabItemProps) {
  const c = isDark ? Colors.dark : Colors.light;
  const primary = isDark ? Colors.dark.primary : Colors.light.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.tabButton, { width: tabWidth > 0 ? tabWidth : undefined }]}
      accessibilityLabel={item.name}
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.tabContent}>
        <Icon
          name={item.icon}
          set={isActive ? "bold" : "light"}
          size={22}
          color={isActive ? primary : c.mutedForeground}
        />

        {item.badge && unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: primary }]}>
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
  },
  dockWrapper: {
    width: "100%",
    paddingHorizontal: Spacing.md,
  },
  dockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Gap.md,
  },
  pillShadowWrap: {
    flex: 1,
    borderRadius: Radius.pill,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    shadowOpacity: 0.12,
    elevation: 6,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    overflow: "hidden",
    position: "relative",
  },
  pillBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Active pill background - slides with spring
  activePill: {
    position: "absolute",
    top: Spacing.xs,
    bottom: Spacing.xs,
    left: Spacing.xs,
    borderRadius: Radius.pill,
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
    flexDirection: "column",
    gap: 2,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 0.24,
    elevation: 4,
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
    fontFamily: FontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
});