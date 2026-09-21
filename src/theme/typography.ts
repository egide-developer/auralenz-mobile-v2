// AuraLenz — typography tokens
// Font: Urbanist (Google Fonts), default 15px/21px, weight 500

export const FontFamily = {
  regular: "Urbanist-Regular",
  medium: "Urbanist-Medium",
  semibold: "Urbanist-SemiBold",
  bold: "Urbanist-Bold",
};

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const Typography = {
  h1: { fontFamily: FontFamily.bold, fontSize: FontSize["3xl"], lineHeight: 38 },
  h2: { fontFamily: FontFamily.bold, fontSize: FontSize["2xl"], lineHeight: 30 },
  h3: { fontFamily: FontFamily.semibold, fontSize: FontSize.xl, lineHeight: 26 },
  h4: { fontFamily: FontFamily.semibold, fontSize: FontSize.lg, lineHeight: 24 },

  body: { fontFamily: FontFamily.medium, fontSize: FontSize.base, lineHeight: 21 },
  bodySmall: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, lineHeight: 20 },
  caption: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 16 },

  label: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, lineHeight: 16 },
  button: { fontFamily: FontFamily.semibold, fontSize: FontSize.xs, lineHeight: 16 },

  tabLabel: { fontFamily: FontFamily.semibold, fontSize: 10, lineHeight: 13 },
} as const;
