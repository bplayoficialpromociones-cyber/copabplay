/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'bungee': ["'Bungee'", 'sans-serif'],
        'sans': ["'Inter'", 'sans-serif'],
      },
      colors: {
        'bplay': {
          DEFAULT: '#00FF87',
          dark: '#00CC6A',
          light: '#33FF9F',
        },
      },
    },
  },
  plugins: [],
};
