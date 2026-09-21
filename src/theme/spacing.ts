// AuraLenz — spacing & radius tokens
// Radius: --radius = 1.125rem (18px) from frontend/src/index.css

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const Radius = {
  sm: 10,    // radius - 8px
  md: 14,    // radius - 4px
  lg: 18,    // radius (1.125rem)
  xl: 22,    // radius + 4px
  "2xl": 26, // radius + 8px
  pill: 9999,
} as const;
