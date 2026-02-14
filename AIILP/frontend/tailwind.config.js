/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1d4ed8',
          light: '#60a5fa',
          dark: '#1e40af',
        },
        accent: '#14b8a6',
      },
    },
  },
  plugins: [],
}