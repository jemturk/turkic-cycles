/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // "class" avoids a NativeWind web bug where the default "media" strategy throws
  // "Cannot manually set color scheme" on first load (react-native-css-interop's
  // stylesheet-injection race unconditionally calls colorScheme.set()).
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Approximated from the prototype — swap for real brand values when available.
        coral: {
          50: "#FDEDE5",
          100: "#FBD9C9",
          400: "#E68F68",
          500: "#D9663D",
          600: "#C24F2A",
        },
        teal: {
          50: "#E4F3F1",
          400: "#3FA79A",
          500: "#2C8B80",
          600: "#206E65",
        },
        ink: {
          // 50/200/800/950 exist only for dark mode (primary text, secondary text,
          // card surface, and page background respectively) -- 900/700/400 above are
          // the original light-mode-only scale used everywhere else.
          950: "#171310",
          900: "#2B2320",
          800: "#352C27",
          700: "#4A3F3A",
          400: "#8A7C76",
          200: "#C9BFB9",
          50: "#F5F1EE",
        },
      },
      fontFamily: {
        display: ["Fraunces_600SemiBold"],
        body: ["System"],
      },
    },
  },
  plugins: [],
};
