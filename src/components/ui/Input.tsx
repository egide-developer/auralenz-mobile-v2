import { TextInput, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import type { IconSvgElement } from "@hugeicons/react-native";
import { Colors } from "../../theme/colors";
import { Radius, Spacing, Gap } from "../../theme/spacing";
import { FontFamily } from "../../theme/typography";
import { useThemeStore } from "../../stores/themeStore";
import { AppIcon } from "./AppIcon";

export type InputSize = "sm" | "md" | "lg";

const sizeStyles: Record<InputSize, { paddingHorizontal: number; paddingVertical: number; height: number; fontSize: number }> = {
  sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, height: 36, fontSize: 15 },
  md: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, height: 44, fontSize: 17 },
  lg: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, height: 52, fontSize: 18 },
};

interface InputProps extends Omit<React.ComponentProps<typeof TextInput>, "style" | "onChangeText" | "value" | "placeholderTextColor" | "disabled"> {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  size?: InputSize;
  disabled?: boolean;
  error?: string;
  leftIcon?: IconSvgElement;
  rightIcon?: IconSvgElement;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  style?: any;
  placeholderTextColor?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  maxLength?: number;
  onBlur?: () => void;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  size = "md",
  disabled = false,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry = false,
  style,
  placeholderTextColor,
  autoFocus = false,
  multiline = false,
  maxLength,
  onBlur,
  ...rest
}: InputProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const c = isDark ? Colors.dark : Colors.light;
  const s = sizeStyles[size];

  const hasFocus = useSharedValue(false);
  const borderColor = error ? c.destructive : hasFocus.value ? c.primary : c.border;
  const backgroundColor = disabled ? c.muted : c.background;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: c.foreground }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: backgroundColor,
            borderColor,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: Radius.xl,
            height: multiline ? undefined : s.height,
            minHeight: multiline ? 100 : s.height,
          },
        ]}
      >
        {leftIcon && (
          <View style={styles.iconLeft}>
            <AppIcon icon={leftIcon} size={20} color={c.mutedForeground} />
          </View>
        )}
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || c.mutedForeground + "80"}
          secureTextEntry={secureTextEntry}
          disabled={disabled}
          autoFocus={autoFocus}
          multiline={multiline}
          maxLength={maxLength}
          onBlur={onBlur}
          onFocus={() => { hasFocus.value = true; }}
          style={[
            styles.textInput,
            {
              flex: 1,
              fontSize: s.fontSize,
              paddingHorizontal: leftIcon ? 0 : s.paddingHorizontal,
              paddingVertical: s.paddingVertical,
              color: c.foreground,
              fontFamily: FontFamily.medium,
            },
          ]}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={disabled}
            style={styles.iconRight}
            hitSlop={8}
          >
            <AppIcon icon={rightIcon} size={20} color={c.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs, width: "100%" },
  label: { fontFamily: FontFamily.medium, fontSize: 15, lineHeight: 20 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    gap: Gap.sm,
  },
  textInput: {
    textAlignVertical: "center",
  },
  iconLeft: { paddingLeft: Spacing.xs },
  iconRight: { paddingRight: Spacing.xs },
  error: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
});