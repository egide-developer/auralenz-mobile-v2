// AuraLenz — unsloped color tokens
// One warm graphite neutral ramp (camera/darkroom world), three text roles, one accent

export const Colors = {
  light: {
    background: "#F5F3EF",      // warm off-white (paper)
    foreground: "#1A1A1A",      // near-black

    card: "#FFFFFF",
    cardForeground: "#1A1A1A",

    popover: "#FFFFFF",
    popoverForeground: "#1A1A1A",

    primary: "#7FA322",         // darker green for contrast on light (4.5:1 on white)
    primaryForeground: "#FFFFFF",

    secondary: "#EBE8E0",       // warm grey
    secondaryForeground: "#1A1A1A",

    muted: "#EBE8E0",
    mutedForeground: "#6B6B6B", // 4.5:1 on background

    accent: "#7FA322",          // same as primary
    accentForeground: "#FFFFFF",

    destructive: "#C0392B",
    destructiveForeground: "#FFFFFF",

    border: "#DCD8D0",          // 10% opacity on foreground
    input: "#DCD8D0",
    ring: "#7FA322",

    success: "#1E8A49",         // toned down
    successForeground: "#FFFFFF",

    warning: "#B87A00",         // toned down
    warningForeground: "#FFFFFF",

    glass: "rgba(255,255,255,0.92)",
    glassBorder: "rgba(220,216,208,0.5)",

    verified: "#0284C7",
    online: "#1E8A49",
  },

  dark: {
    background: "#0A0A0A",      // warm black (darkroom)
    foreground: "#F0EFEB",

    card: "#121212",
    cardForeground: "#F0EFEB",

    popover: "#161616",
    popoverForeground: "#F0EFEB",

    primary: "#99CC33",         // brand green
    primaryForeground: "#0A0A0A",

    secondary: "#1A1A1A",
    secondaryForeground: "#F0EFEB",

    muted: "#1A1A1A",
    mutedForeground: "#8A8A8A", // 4.5:1 on background

    accent: "#99CC33",
    accentForeground: "#0A0A0A",

    destructive: "#E85D5D",
    destructiveForeground: "#FFFFFF",

    border: "#2A2A2A",          // 10% opacity on foreground
    input: "#2A2A2A",
    ring: "#99CC33",

    success: "#2DD47A",         // toned down
    successForeground: "#0A0A0A",

    warning: "#F5B800",         // toned down
    warningForeground: "#0A0A0A",

    glass: "rgba(18,18,18,0.92)",
    glassBorder: "rgba(42,42,42,0.5)",

    verified: "#38BDF8",
    online: "#2DD47A",
  },
} as const;

export type ColorScheme = keyof typeof Colors;

// Skeleton-specific colors (slightly lighter than background for shimmer base)
export const SkeletonColors = {
  light: {
    base: "#E8E6E0",      // lighter than background #F5F3EF
    highlight: "#F5F3EF", // background color for shimmer
  },
  dark: {
    base: "#1A1A1A",      // lighter than background #0A0A0A
    highlight: "#242424", // slightly lighter for shimmer
  },
} as const;