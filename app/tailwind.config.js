/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          800: "#1F3A3D",
        },
        yellow: {
          50: "#FFEB3B",
        },
      },
      fontFamily: {
        geist: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        dohyeon: ["var(--font-dohyeon)", "sans-serif"],
        nanumBrush: ["var(--font-nanum-brush)", "cursive"],
      },
    },
  },
  plugins: [],
};
