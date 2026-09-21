// AuraLenz — exact tokens from frontend/src/index.css (HSL → hex)
// Matches web CSS variables 1:1

export const Colors = {
  light: {
    background: "#F2F2EF",
    foreground: "#1F1F1F",

    card: "#FFFFFF",
    cardForeground: "#1F1F1F",

    popover: "#FFFFFF",
    popoverForeground: "#1F1F1F",

    primary: "#99CC33",
    primaryForeground: "#1F1F1F",

    secondary: "#EBEBEA",
    secondaryForeground: "#1F1F1F",

    muted: "#EBEBEA",
    mutedForeground: "#737373",

    accent: "#99CC33",
    accentForeground: "#1F1F1F",

    destructive: "#DD2C2C",
    destructiveForeground: "#FFFFFF",

    border: "#E6E6E6",
    input: "#E6E6E6",
    ring: "#99CC33",

    success: "#22C55E",
    successForeground: "#FFFFFF",

    warning: "#F59E0B",
    warningForeground: "#FFFFFF",

    sidebar: {
      background: "#FAFAFA",
      foreground: "#1F1F1F",
      primary: "#99CC33",
      primaryForeground: "#1F1F1F",
      accent: "#F5F5F5",
      accentForeground: "#1F1F1F",
      border: "#EBEBEB",
      ring: "#99CC33",
    },

    glass: "rgba(255,255,255,0.92)",
    glassBorder: "rgba(230,230,230,0.5)",

    // App-specific tokens
    storyGradient: ["#DA2276", "#E55536"] as const,
    verified: "#38BDF8",
    online: "#22C55E",
  },

  dark: {
    background: "#000000",
    foreground: "#F4F5F6",

    card: "#0F0F0F",
    cardForeground: "#F4F5F6",

    popover: "#171717",
    popoverForeground: "#F4F5F6",

    primary: "#99CC33",
    primaryForeground: "#1F1F1F",

    secondary: "#0F0F0F",
    secondaryForeground: "#F4F5F6",

    muted: "#0F0F0F",
    mutedForeground: "#787878",

    accent: "#99CC33",
    accentForeground: "#1F1F1F",

    destructive: "#DD2C2C",
    destructiveForeground: "#FFFFFF",

    border: "#262626",
    input: "#262626",
    ring: "#99CC33",

    success: "#22C55E",
    successForeground: "#FFFFFF",

    warning: "#F59E0B",
    warningForeground: "#FFFFFF",

    sidebar: {
      background: "#000000",
      foreground: "#F4F5F6",
      primary: "#99CC33",
      primaryForeground: "#1F1F1F",
      accent: "#0F0F0F",
      accentForeground: "#F4F5F6",
      border: "#262626",
      ring: "#99CC33",
    },

    glass: "rgba(15,15,15,0.92)",
    glassBorder: "rgba(38,38,38,0.5)",

    // App-specific tokens
    storyGradient: ["#DA2276", "#E55536"] as const,
    verified: "#38BDF8",
    online: "#22C55E",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
