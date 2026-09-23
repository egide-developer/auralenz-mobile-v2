// AuraLenz Input — mirrors frontend/src/components/ui/input.tsx (no glow)
import React from "react";
import { TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { Colors } from "../../theme/colors";
import { Radius } from "../../theme/spacing";
import { Typography } from "../../theme/typography";
import { Shadows } from "../../theme/shadows";

interface InputProps extends TextInputProps {
  isDark?: boolean;
}

export function Input({ isDark = false, style, ...props }: InputProps) {
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.wrapper, style]}>
      <TextInput
        {...props}
        placeholderTextColor={isDark ? Colors.dark.mutedForeground + "80" : Colors.light.mutedForeground + "80"}
        style={[
          styles.input,
          {
            color: isDark ? Colors.dark.foreground : Colors.light.foreground,
            backgroundColor: isDark ? Colors.dark.card + "80" : Colors.light.card + "80", // 50%
          },
          Shadows[isDark ? "dark" : "light"]["soft"],
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  input: {
    height: 48,
    borderRadius: Radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: Typography.body.fontSize,
    lineHeight: 21,
  },
});
