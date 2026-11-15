// AuraLenz — unsloped typography tokens
// Two weights: 400 (regular) and 500 (medium). 600 (semibold) only for rare emphasis.
// Hierarchy from size and color, not weight. Sentence case everywhere.

export const FontFamily = {
  regular: "Urbanist-Regular",   // 400
  medium: "Urbanist-Medium",     // 500
  semibold: "Urbanist-SemiBold", // 600 - rare emphasis only
  bold: "Urbanist-SemiBold",     // alias for semibold (backward compat)
};

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const Typography = {
  // Display - semibold only for h1/h2
  h1: { fontFamily: FontFamily.semibold, fontSize: FontSize["3xl"], lineHeight: 38 },
  h2: { fontFamily: FontFamily.semibold, fontSize: FontSize["2xl"], lineHeight: 30 },
  h3: { fontFamily: FontFamily.medium, fontSize: FontSize.xl, lineHeight: 26 },
  h4: { fontFamily: FontFamily.medium, fontSize: FontSize.lg, lineHeight: 24 },

  // Body - medium (500) for UI, regular (400) for reading text
  body: { fontFamily: FontFamily.medium, fontSize: FontSize.base, lineHeight: 21 },
  bodySmall: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, lineHeight: 20 },
  caption: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 16 },

  // UI labels - medium, sentence case
  label: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, lineHeight: 16, textTransform: "none" as const },
  button: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, lineHeight: 16, textTransform: "none" as const },

  tabLabel: { fontFamily: FontFamily.medium, fontSize: 11, lineHeight: 14, textTransform: "none" as const },

  // Numbers - tabular
  mono: { fontFamily: "SpaceMono-Regular", fontSize: FontSize.sm, lineHeight: 20 },
  monoSm: { fontFamily: "SpaceMono-Regular", fontSize: FontSize.xs, lineHeight: 16 },
} as const;
