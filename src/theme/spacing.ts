// AuraLenz — spacing & radius tokens
// Everything on a 4px grid. Radius from --radius = 18px (frontend/src/index.css)

export const Spacing = {
  "2xs": 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,     // radius - 10px (for nested: 18 - 8 = 10, round to 8)
  md: 12,    // radius - 6px (for nested: 18 - 12 = 6, round to 8)
  lg: 18,    // radius (1.125rem)
  xl: 22,    // radius + 4px
  "2xl": 26, // radius + 8px
  pill: 9999,
} as const;

export const AvatarSize = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
  "2xl": 64,
  "3xl": 96,
} as const;

export const IconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const Gap = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
