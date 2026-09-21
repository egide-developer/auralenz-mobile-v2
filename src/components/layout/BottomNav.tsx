// AuraLenz BottomNav — mirrors web MobileNav.tsx
// Floating glass pill with 4 tabs + separate Create FAB
// Animated sliding active pill indicator
import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_DOCK_WIDTH = Math.min(SCREEN_WIDTH - 20, 416);

const SPRING_CONFIG = { damping: 20, stiffness: 350, mass: 0.8 };

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const totalUnread = useUnreadStore((s) => s.totalUnread);
  const isCreate = pathname.startsWith("/create");

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
  );
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  const translateX = useSharedValue(safeIndex);

  React.useEffect(() => {
    translateX.value = safeIndex;
  }, [safeIndex]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(translateX.value * (100 / NAV_ITEMS.length), SPRING_CONFIG) }],
  }));

  const handleCreate = () => {
    if (!isCreate) {
      router.push("/create");
      return;
    }
    router.back();
  };

  return (
    <View style={[styles.container, { marginBottom: 8 + insets.bottom }]}>
      <View style={[styles.dockWrapper, { maxWidth: MAX_DOCK_WIDTH }]}>
        <View style={styles.dockRow}>
          {/* Main pill with 4 tabs */}
          <View
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
            <Animated.View
              style={[
                styles.activeIndicator,
                pillStyle,
                {
                  width: `${100 / NAV_ITEMS.length}%`,
                  backgroundColor: isDark ? Colors.dark.primary + "12" : Colors.light.primary + "12",
                  borderColor: isDark ? Colors.dark.primary + "1A" : Colors.light.primary + "1A",
                },
              ]}
            />

            {NAV_ITEMS.map((item, index) => {
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
              style={{
                transform: [{ rotate: isCreate ? "135deg" : "0deg" }],
              }}
            />
          </TouchableOpacity>
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
          <View style={[styles.badge, { backgroundColor: isDark ? Colors.dark.destructive : Colors.light.destructive }]}>
            <View style={[styles.badgeInner, { backgroundColor: isDark ? Colors.dark.card : Colors.light.card }]}>
              <Animated.Text
                style={[styles.badgeText, { color: isDark ? Colors.dark.destructiveForeground : Colors.light.destructiveForeground }]}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Animated.Text>
            </View>
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
    gap: 10,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 4,
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
    left: 4,
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
    top: -6,
    right: -10,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeInner: {
    flex: 1,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
  },
});
