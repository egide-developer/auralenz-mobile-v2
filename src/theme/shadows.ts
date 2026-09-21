// AuraLenz — shadow tokens from frontend tailwind.config.ts
// Shadow colors use foreground with varying alpha

import { Colors } from "./colors";

export const Shadows = {
  light: {
    soft: {
      shadowColor: Colors.light.foreground,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 20,
      elevation: 2,
    },
    "soft-md": {
      shadowColor: Colors.light.foreground,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.04,
      shadowRadius: 32,
      elevation: 4,
    },
    "soft-lg": {
      shadowColor: Colors.light.foreground,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.05,
      shadowRadius: 48,
      elevation: 6,
    },
    "soft-xl": {
      shadowColor: Colors.light.foreground,
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.06,
      shadowRadius: 64,
      elevation: 8,
    },
  },
  dark: {
    soft: {
      shadowColor: Colors.dark.foreground,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 20,
      elevation: 2,
    },
    "soft-md": {
      shadowColor: Colors.dark.foreground,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.04,
      shadowRadius: 32,
      elevation: 4,
    },
    "soft-lg": {
      shadowColor: Colors.dark.foreground,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.05,
      shadowRadius: 48,
      elevation: 6,
    },
    "soft-xl": {
      shadowColor: Colors.dark.foreground,
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.06,
      shadowRadius: 64,
      elevation: 8,
    },
  },
} as const;

export type ShadowKey = keyof typeof Shadows.light;
