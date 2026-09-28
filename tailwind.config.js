/** @type {import('tailwindcss').Config} */
module.exports = {
  // constants/ is included too: some class strings (e.g. circle-topic badge colors)
  // live only in a constants file, not repeated verbatim in any app/component file --
  // Tailwind's JIT scanner only generates CSS for a class name it finds in a scanned
  // file, so those had no CSS generated at all until this file was in scope.
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/constants/**/*.{js,ts}",
  ],
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
          100: "#BFE3DD",
          400: "#3FA79A",
          500: "#2C8B80",
          600: "#206E65",
        },
        // Third accent hue, used only for circle-topic badges so 5 topics can each
        // get a genuinely distinct color instead of doubling up on coral/teal.
        gold: {
          100: "#F3DFA8",
          600: "#9C7A28",
        },
        ink: {
          // 50/100/200/800/950 exist only for dark mode or neutral-tint badges
          // (primary text, a neutral badge bg, secondary text, card surface, and
          // page background respectively) -- 900/700/400 above are the original
          // light-mode-only scale used everywhere else.
          950: "#171310",
          900: "#2B2320",
          800: "#352C27",
          700: "#4A3F3A",
          400: "#8A7C76",
          200: "#C9BFB9",
          100: "#E8DFDA",
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
