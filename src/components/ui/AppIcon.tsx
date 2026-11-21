import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";

export interface AppIconProps {
  icon: IconSvgElement;
  altIcon?: IconSvgElement;
  showAlt?: boolean;
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function AppIcon({
  icon,
  altIcon,
  showAlt,
  size = 24,
  color,
  fill,
  strokeWidth = 1.5,
  style,
}: AppIconProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const resolvedColor = color ?? colors.foreground;
  const resolvedFill = fill ?? (color ? "transparent" : undefined);

  return (
    <HugeiconsIcon
      icon={icon}
      altIcon={altIcon}
      showAlt={showAlt}
      size={size}
      color={resolvedColor}
      fill={resolvedFill}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
}

export type { IconSvgElement };
