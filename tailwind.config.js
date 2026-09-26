/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
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
          900: "#2B2320",
          700: "#4A3F3A",
          400: "#8A7C76",
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
