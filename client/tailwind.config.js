/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        chat: {
          bg: '#0b141a',
          sidebar: '#111b21',
          header: '#202c33',
          card: '#182229',
          bubbleOut: '#005c4b',
          bubbleIn: '#202c33',
          input: '#2a3942',
          border: '#222d34',
          accent: '#00a884',
          textMuted: '#8696a0',
        }
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
        pulseSubtle: 'pulseSubtle 1.5s infinite ease-in-out'
      }
    },
  },
  plugins: [],
}
