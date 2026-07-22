/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF385C',
          hover: '#E00B41',
          light: '#FFF8F8',
        },
        secondary: '#008489',
        dark: '#222222',
        muted: '#717171',
        border: '#DDDDDD',
      },
    },
  },
  plugins: [],
};