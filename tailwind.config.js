/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Urbanist"],
      },
      colors: {
        primary: "#84CC16",
        background: {
          light: "#F5F6FA",
          dark: "#000000",
        },
        card: {
          light: "#FFFFFF",
          dark: "#0A0A0A",
        },
      },
    },
  },
  plugins: [],
};
