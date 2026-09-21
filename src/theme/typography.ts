// AuraLenz — typography tokens
// Font: Urbanist (Google Fonts), default 15px/21px, weight 500

export const FontFamily = {
  urbanist: "Urbanist",
};

export const FontSize = {
  xs: 12,    // text-xs
  sm: 14,    // text-sm
  base: 15,  // body (web default)
  md: 16,    // text-base
  lg: 18,    // text-lg
  xl: 20,    // text-xl
  "2xl": 24, // text-2xl
  "3xl": 30, // text-3xl
  "4xl": 36, // text-4xl
} as const;

export const FontWeight = {
  normal: "500" as const,    // web body default
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const LineHeight = {
  tight: 1.25,
  snug: 1.375,
  normal: 1.4,   // 15px / 21px ≈ 1.4
  relaxed: 1.625,
  loose: 2,
} as const;

export const Typography = {
  // Heading styles
  h1: { fontFamily: FontFamily.urbanist, fontSize: FontSize["3xl"], fontWeight: FontWeight.bold, lineHeight: LineHeight.tight },
  h2: { fontFamily: FontFamily.urbanist, fontSize: FontSize["2xl"], fontWeight: FontWeight.bold, lineHeight: LineHeight.tight },
  h3: { fontFamily: FontFamily.urbanist, fontSize: FontSize.xl, fontWeight: FontWeight.semibold, lineHeight: LineHeight.snug },
  h4: { fontFamily: FontFamily.urbanist, fontSize: FontSize.lg, fontWeight: FontWeight.semibold, lineHeight: LineHeight.snug },

  // Body styles
  body: { fontFamily: FontFamily.urbanist, fontSize: FontSize.base, fontWeight: FontWeight.normal, lineHeight: LineHeight.normal },
  bodySmall: { fontFamily: FontFamily.urbanist, fontSize: FontSize.sm, fontWeight: FontWeight.normal, lineHeight: LineHeight.normal },
  caption: { fontFamily: FontFamily.urbanist, fontSize: FontSize.xs, fontWeight: FontWeight.normal, lineHeight: LineHeight.normal },

  // Label / button
  label: { fontFamily: FontFamily.urbanist, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, lineHeight: LineHeight.snug },
  button: { fontFamily: FontFamily.urbanist, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, lineHeight: LineHeight.snug },

  // Tab
  tabLabel: { fontFamily: FontFamily.urbanist, fontSize: 10, fontWeight: FontWeight.semibold, lineHeight: LineHeight.tight },
} as const;
