// AuraLenz — unsloped typography tokens
// Two weights: 400 (regular) and 500 (medium). 600 (semibold) only for rare emphasis.
// Hierarchy from size and color, not weight. Sentence case everywhere.

export const FontFamily = {
  regular: "Urbanist-Regular",   // 400
  medium: "Urbanist-Medium",     // 500
  semibold: "Urbanist-SemiBold", // 600 - rare emphasis only
  bold: "Urbanist-SemiBold",     // alias for semibold (backward compat)
  mono: "GeistMono-Regular",
  monoMedium: "GeistMono-Medium",
};

export const FontSize = {
  xs: 13,
  sm: 15,
  base: 17,
  md: 18,
  lg: 20,
  xl: 22,
  "2xl": 26,
  "3xl": 32,
  "4xl": 38,
} as const;

export const Typography = {
  // Display - semibold only for h1/h2
  h1: { fontFamily: FontFamily.semibold, fontSize: FontSize["3xl"], lineHeight: 40 },
  h2: { fontFamily: FontFamily.semibold, fontSize: FontSize["2xl"], lineHeight: 32 },
  h3: { fontFamily: FontFamily.medium, fontSize: FontSize.xl, lineHeight: 28 },
  h4: { fontFamily: FontFamily.medium, fontSize: FontSize.lg, lineHeight: 26 },

  // Body - medium (500) for UI, regular (400) for reading text
  body: { fontFamily: FontFamily.medium, fontSize: FontSize.base, lineHeight: 24 },
  bodySmall: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, lineHeight: 22 },
  caption: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },

  // UI labels - medium, sentence case
  label: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, lineHeight: 18, textTransform: "none" as const },
  button: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, lineHeight: 18, textTransform: "none" as const },

  tabLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, lineHeight: 16, textTransform: "none" as const },

  // Numbers - tabular (Geist Mono, registered in app/_layout.tsx)
  mono: { fontFamily: FontFamily.mono, fontSize: FontSize.sm, lineHeight: 22 },
  monoSm: { fontFamily: FontFamily.mono, fontSize: FontSize.xs, lineHeight: 18 },
} as const;
