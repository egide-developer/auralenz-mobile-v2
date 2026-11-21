import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import type { IconSvgElement } from "@hugeicons/react-native";
import { useToastStore, type ToastKind } from "../../stores/toastStore";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Spacing } from "../../theme/spacing";
import { FontFamily } from "../../theme/typography";
import { AppIcon } from "./AppIcon";
import { icons } from "../../constants/icons";

const ICONS: Record<ToastKind, IconSvgElement> = {
  error: icons.danger,
  info: icons.info,
  success: icons.success,
};

const ACCENTS: Record<ToastKind, string> = {
  error: "#FF4757",
  info: "#3B82F6",
  success: "#2ECC71",
};

/**
 * Mounted once at the app root. Exists so transient failures — a rejected
 * room join, a blocked recipient, a failed call — can surface without the
 * interruption of a modal Alert.
 */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + Spacing.sm }]}>
      {toasts.map((toast) => (
        <Animated.View key={toast.id} entering={FadeInDown.duration(180)} exiting={FadeOutUp.duration(160)}>
          <Pressable
            onPress={() => dismiss(toast.id)}
            style={[styles.toast, { backgroundColor: colors.card, borderColor: ACCENTS[toast.kind] }]}
          >
            <AppIcon icon={ICONS[toast.kind]} size={18} color={ACCENTS[toast.kind]} />
            <Text style={[styles.message, { color: colors.foreground }]} numberOfLines={3}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    gap: Spacing.sm,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: { flex: 1, fontFamily: FontFamily.medium, fontSize: 16 },
});
