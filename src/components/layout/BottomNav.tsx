import { useRef, useEffect } from "react";
import { Pressable, Text, View, StyleSheet, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { useThemeStore } from "../../stores/themeStore";
import { useUnreadStore } from "../../stores/unreadStore";
import { Colors } from "../../theme/colors";
import { Spacing } from "../../theme/spacing";
import { FontFamily, Typography } from "../../theme/typography";
import { AppIcon } from "../ui/AppIcon";
import { GlassSurface } from "../ui/GlassSurface";
import { icons } from "../../constants/icons";
import type { IconSvgElement } from "@hugeicons/react-native";

interface NavItem {
  name: string;
  icon: IconSvgElement;
  path: string;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "home", icon: icons.home, path: "/" },
  { name: "search", icon: icons.search, path: "/search" },
  { name: "reels", icon: icons.play, path: "/reels" },
  { name: "messages", icon: icons.message, path: "/messages", badge: true },
  { name: "profile", icon: icons.user, path: "/profile" },
];

const ACCENT_TINT_LIGHT = "rgba(127,163,34,0.10)";
const ACCENT_TINT_DARK = "rgba(153,204,51,0.12)";

function createAnimations(): Animated.Value[] {
  return NAV_ITEMS.map(() => new Animated.Value(0));
}

export function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isDark = useThemeStore((s) => s.isDark);
  const unreadCount = useUnreadStore((s) => s.totalUnread);
  const c = isDark ? Colors.dark : Colors.light;

  const isActive = (path: string): boolean => {
    if (path === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(path);
  };

  const accentTint = isDark ? ACCENT_TINT_DARK : ACCENT_TINT_LIGHT;

  const activeAnimationsRef = useRef<Animated.Value[]>([]);
  if (activeAnimationsRef.current.length === 0) {
    activeAnimationsRef.current = createAnimations();
  }
  const activeAnimations = activeAnimationsRef.current;

  useEffect(() => {
    NAV_ITEMS.forEach((item, index) => {
      const active = isActive(item.path);
      Animated.timing(activeAnimations[index], {
        toValue: active ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, [pathname]);

  return (
    <GlassSurface
      intensity="strong"
      bordered
      borderEdge="top"
      radius={0}
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Spacing.md) },
      ]}
    >
      <View style={styles.inner}>
        {NAV_ITEMS.map((item, index) => {
          const active = isActive(item.path);
          const badgeCount = item.badge ? unreadCount : 0;
          const anim = activeAnimations[index];

          const iconColor = active ? c.primary : c.mutedForeground;

          return (
            <Pressable
              key={item.name}
              onPress={() => router.push(item.path)}
              style={styles.navItem}
            >
              <View style={styles.itemColumn}>
                <Animated.View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["transparent", accentTint],
                      }),
                      width: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 64],
                      }),
                      height: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [28, 36],
                      }),
                      borderRadius: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 18],
                      }),
                    },
                  ]}
                >
                  <AppIcon
                    icon={item.icon}
                    size={28}
                    color={iconColor}
                    strokeWidth={1.5}
                  />
                </Animated.View>
                {badgeCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: c.primary }]}>
                    <Text style={[styles.badgeText, { color: c.primaryForeground }]}>
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: Spacing.xs,
  },
  itemColumn: {
    alignItems: "center",
    position: "relative",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    lineHeight: 12,
  },
});