// AuraLenz Button — mirrors frontend/src/components/ui/button.tsx (no glow)
import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Colors } from "../../theme/colors";
import { Radius, Spacing } from "../../theme/spacing";
import { Typography, FontFamily } from "../../theme/typography";
import { Shadows } from "../../theme/shadows";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "action";
type ButtonSize = "default" | "sm" | "lg" | "xl" | "icon" | "icon-sm" | "icon-lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, (isDark: boolean) => ViewStyle> = {
  default: (isDark) => ({
    backgroundColor: isDark ? Colors.dark.primary : Colors.light.primary,
    ...Shadows[isDark ? "dark" : "light"]["soft-md"],
  }),
  destructive: (isDark) => ({
    backgroundColor: isDark ? Colors.dark.destructive : Colors.light.destructive,
    ...Shadows[isDark ? "dark" : "light"]["soft-md"],
  }),
  outline: (isDark) => ({
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: isDark
      ? Colors.dark.border + "66" // 40%
      : Colors.light.border + "66",
  }),
  secondary: (isDark) => ({
    backgroundColor: isDark ? Colors.dark.secondary : Colors.light.secondary,
    ...Shadows[isDark ? "dark" : "light"]["soft"],
  }),
  ghost: () => ({
    backgroundColor: "transparent",
  }),
  link: () => ({
    backgroundColor: "transparent",
  }),
  action: (isDark) => ({
    backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
    borderWidth: 1,
    borderColor: isDark
      ? Colors.dark.border + "66"
      : Colors.light.border + "66",
    ...Shadows[isDark ? "dark" : "light"]["soft"],
  }),
};

const VARIANT_TEXT_STYLES: Record<ButtonVariant, (isDark: boolean) => TextStyle> = {
  default: (isDark) => ({
    color: isDark ? Colors.dark.primaryForeground : Colors.light.primaryForeground,
  }),
  destructive: () => ({
    color: "#FFFFFF",
  }),
  outline: (isDark) => ({
    color: isDark ? Colors.dark.foreground : Colors.light.foreground,
  }),
  secondary: (isDark) => ({
    color: isDark ? Colors.dark.secondaryForeground : Colors.light.secondaryForeground,
  }),
  ghost: (isDark) => ({
    color: isDark ? Colors.dark.foreground : Colors.light.foreground,
  }),
  link: (isDark) => ({
    color: isDark ? Colors.dark.primary : Colors.light.primary,
  }),
  action: (isDark) => ({
    color: isDark ? Colors.dark.mutedForeground : Colors.light.mutedForeground,
  }),
};

const SIZE_STYLES: Record<ButtonSize, ViewStyle> = {
  default: { height: 44, paddingHorizontal: 24, paddingVertical: 8 },
  sm: { height: 36, paddingHorizontal: 16, paddingVertical: 4, borderRadius: Radius.md },
  lg: { height: 48, paddingHorizontal: 32, paddingVertical: 8, borderRadius: Radius.pill },
  xl: { height: 56, paddingHorizontal: 40, paddingVertical: 8, borderRadius: Radius.pill },
  icon: { width: 40, height: 40, borderRadius: Radius.md },
  "icon-sm": { width: 36, height: 36, borderRadius: Radius.md },
  "icon-lg": { width: 44, height: 44, borderRadius: Radius.md },
};

const SIZE_TEXT_STYLES: Record<ButtonSize, TextStyle> = {
  default: { ...Typography.button },
  sm: { fontFamily: FontFamily.semibold, fontSize: 11 },
  lg: { ...Typography.button, fontSize: 14 },
  xl: { ...Typography.button, fontSize: 16 },
  icon: { fontSize: 14 },
  "icon-sm": { fontSize: 12 },
  "icon-lg": { fontSize: 14 },
};

export function Button({
  variant = "default",
  size = "default",
  disabled = false,
  loading = false,
  onPress,
  children,
  style,
  textStyle,
}: ButtonProps) {
  const isDark = false; // TODO: use theme store
  const variantStyle = VARIANT_STYLES[variant](isDark);
  const variantTextStyle = VARIANT_TEXT_STYLES[variant](isDark);
  const sizeStyle = SIZE_STYLES[size];
  const sizeTextStyle = SIZE_TEXT_STYLES[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        variantStyle,
        sizeStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantTextStyle.color as string} />
      ) : (
        <Text style={[styles.text, variantTextStyle, sizeTextStyle, textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.pill,
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  text: {
    ...Typography.button,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
