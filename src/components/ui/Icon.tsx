import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { icons, legacyIconNameMap } from "../../constants/icons";
import { AppIcon } from "./AppIcon";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  set?: "light" | "bold";
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

// Compatibility wrapper: maps legacy/custom icon names to Hugeicons.
export function Icon({ name, size = 24, color, strokeWidth, style }: IconProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const resolvedColor = color ?? colors.foreground;
  const icon =
    legacyIconNameMap[name] ?? (icons as Record<string, IconSvgElement | undefined>)[name];

  if (!icon) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[Icon] No Hugeicons mapping for legacy name: "${name}"`);
    }
    return null;
  }

  return (
    <AppIcon
      icon={icon}
      size={size}
      color={resolvedColor}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
}

export type { IconProps };
