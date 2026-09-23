// AuraLenz BottomNav — mirrors web MobileNav.tsx
// Floating glass pill with 4 tabs + separate Create FAB
// Animated sliding active pill indicator
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
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "../ui/Icon";
import { PlusSolid } from "../ui/icons/plus-solid";
import { useThemeStore } from "../../stores/themeStore";
import { useUnreadStore } from "../../stores/unreadStore";
import { Colors } from "../../theme/colors";
import { Radius } from "../../theme/spacing";
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
  { name: "reels", icon: "video", path: "/reels" },
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
  const themeIsDark = useThemeStore((s) => s.isDark);
  const totalUnread = useUnreadStore((s) => s.totalUnread);
  const isCreate = pathname.startsWith("/create");
  // Reels is a full-bleed black video background regardless of app theme —
  // force the pill into its dark glass variant there so it doesn't read as
  // a jarring light chip floating over video, matching Instagram/TikTok.
  const isReelsTab = pathname === "/reels";
  const isDark = isReelsTab || themeIsDark;

  const [pillWidth, setPillWidth] = useState(0);
  const tabWidth = pillWidth > 0 ? pillWidth / NAV_ITEMS.length : 0;

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
  );
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  const indicatorX = useSharedValue(0);
  const fabRotation = useSharedValue(0);
  // "Liquid mode" — a soft highlight blob that slowly drifts side to side,
  // like light moving across the surface of liquid glass.
  const liquidShift = useSharedValue(0);

  useEffect(() => {
    liquidShift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const liquidBlobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -18 + liquidShift.value * 36 }],
  }));

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
    <Animated.View style={[styles.container, keyboardStyle, { paddingBottom: 8 + insets.bottom }]}>
      <View style={[styles.dockWrapper, { maxWidth: dockMaxWidth }]}>
        <View style={styles.dockRow}>
          {/* Main pill with 4 tabs — outer view casts the shadow (needs
              unclipped bounds), inner view clips the blur/gradient layers
              to the pill shape (needs overflow:hidden) */}
          <View
            style={[
              styles.pillShadowWrap,
              { shadowColor: isDark ? "#000000" : "#1A1A1A" },
            ]}
          >
          <View
            onLayout={onPillLayout}
            style={[
              styles.pill,
              {
                borderColor: isDark ? "#FFFFFF26" : "#FFFFFF99",
              },
            ]}
          >
            <BlurView
              intensity={isDark ? 55 : 65}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            {/* Translucent color wash on top of the blur so the pill still
                reads as the app's surface color, not just raw frosted glass */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? Colors.dark.card + "8C" : Colors.light.card + "73" },
              ]}
            />
            {/* Top edge highlight — the light-catching rim of a glass surface */}
            <LinearGradient
              colors={
                isDark
                  ? ["#FFFFFF29", "#FFFFFF00"]
                  : ["#FFFFFFB3", "#FFFFFF00"]
              }
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.6 }}
            />
            {/* Liquid mode — a full-width sheen that slowly drifts across
                the whole pill, like light moving across liquid glass, not
                a separate floating shape */}
            <Animated.View
              pointerEvents="none"
              style={[styles.liquidBlob, liquidBlobStyle]}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ["#FFFFFF00", "#FFFFFF1F", "#FFFFFF00"]
                    : ["#FFFFFF00", "#FFFFFF80", "#FFFFFF00"]
                }
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
              />
            </Animated.View>

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
    </Animated.View>
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
  const squish = useSharedValue(1);
  const squishStyle = useAnimatedStyle(() => ({
    transform: [{ scale: squish.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => {
        // Liquid squish — dips low with a wobbly overshoot on release,
        // like a droplet settling back into shape.
        squish.value = withTiming(0.82, { duration: 90 });
      }}
      onPressOut={() => {
        squish.value = withSpring(1, { damping: 6, stiffness: 220, mass: 0.6 });
      }}
      activeOpacity={0.7}
      style={styles.tabButton}
      accessibilityLabel={item.name}
    >
      <Animated.View style={[styles.tabContent, squishStyle]}>
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
      </Animated.View>
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
  pillShadowWrap: {
    flex: 1,
    borderRadius: Radius.pill,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    shadowOpacity: 0.18,
    elevation: 10,
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
  activeIndicator: {
    position: "absolute",
    top: 1,
    bottom: 1,
    left: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  liquidBlob: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "-40%",
    width: "180%",
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
    fontFamily: FontFamily.bold,
    fontSize: 10,
    lineHeight: 14,
  },
});
