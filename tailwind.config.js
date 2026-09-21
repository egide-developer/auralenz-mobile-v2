/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Urbanist_400Regular", "Urbanist_500Medium", "Urbanist_600SemiBold", "Urbanist_700Bold"],
      },
      colors: {
        background: {
          light: "#F2F2EF",
          dark: "#000000",
        },
        foreground: {
          light: "#1F1F1F",
          dark: "#F4F5F6",
        },
        card: {
          light: "#FFFFFF",
          dark: "#0F0F0F",
        },
        primary: {
          DEFAULT: "#99CC33",
          foreground: "#1F1F1F",
        },
        secondary: {
          light: "#EBEBEA",
          dark: "#0F0F0F",
        },
        muted: {
          light: "#EBEBEA",
          dark: "#0F0F0F",
        },
        "muted-foreground": {
          light: "#737373",
          dark: "#787878",
        },
        accent: {
          DEFAULT: "#99CC33",
          foreground: "#1F1F1F",
        },
        destructive: {
          DEFAULT: "#DD2C2C",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#22C55E",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
        border: {
          light: "#E6E6E6",
          dark: "#262626",
        },
        input: {
          light: "#E6E6E6",
          dark: "#262626",
        },
        ring: "#99CC33",
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "18px",
        xl: "22px",
        "2xl": "26px",
        pill: "9999px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(31,31,31,0.03)",
        "soft-md": "0 8px 32px rgba(31,31,31,0.04)",
        "soft-lg": "0 16px 48px rgba(31,31,31,0.05)",
        "soft-xl": "0 24px 64px rgba(31,31,31,0.06)",
      },
    },
  },
  plugins: [],
};
