import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { PressableScale } from "./PressableScale";
import { Colors } from "../../theme/colors";
import { Radius, Spacing, Gap } from "../../theme/spacing";
import { FontFamily, Typography } from "../../theme/typography";
import { useThemeStore } from "../../stores/themeStore";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const baseStyle = {
  borderRadius: Radius.xl,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "row",
  gap: Gap.sm,
};

const sizeStyles: Record<ButtonSize, { paddingHorizontal: number; paddingVertical: number; height: number }> = {
  sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, height: 32 },
  md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, height: 44 },
  lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, height: 52 },
};

const variantStyles = (isDark: boolean, variant: ButtonVariant) => {
  const c = isDark ? Colors.dark : Colors.light;
  switch (variant) {
    case "primary":
      return { backgroundColor: c.primary, borderWidth: 0 };
    case "secondary":
      return { backgroundColor: c.secondary, borderWidth: 0 };
    case "outline":
      return { backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth, borderColor: c.border };
    case "ghost":
      return { backgroundColor: "transparent", borderWidth: 0 };
    case "destructive":
      return { backgroundColor: c.destructive, borderWidth: 0 };
  }
};

const textColor = (isDark: boolean, variant: ButtonVariant, disabled: boolean) => {
  const c = isDark ? Colors.dark : Colors.light;
  if (disabled) return c.mutedForeground;
  switch (variant) {
    case "primary": return c.primaryForeground;
    case "secondary": return c.secondaryForeground;
    case "outline": return c.foreground;
    case "ghost": return c.foreground;
    case "destructive": return c.destructiveForeground;
  }
};

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: any;
  hitSlop?: number;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  hitSlop,
  fullWidth = false,
}: ButtonProps) {
  const isDark = useThemeStore((s) => s.isDark);

  const textStyle = {
    ...Typography.button,
    color: textColor(isDark, variant, disabled),
  };

  const containerStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles(isDark, variant),
    width: fullWidth ? "100%" : undefined,
    opacity: disabled || loading ? 0.5 : 1,
  };

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={hitSlop}
      style={[containerStyle, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor(isDark, variant, false)} />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyle} numberOfLines={1}>{title}</Text>
          {rightIcon}
        </>
      )}
    </PressableScale>
  );
}