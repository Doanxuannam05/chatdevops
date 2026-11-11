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
        accent: 'var(--accent, #4B3DFF)',
        ink: {
          DEFAULT: '#15130F',
          muted: '#4A4538',
          placeholder: '#6B6455',
        },
        paper: {
          DEFAULT: '#F5F0E6',
          sidebar: '#EDE6D6',
          input: '#FFFBF2',
        },
        pastel: {
          yellow: '#FFD23F',
          mint: '#86E3B8',
          periwinkle: '#A5B0FF',
          orange: '#FF8A4C',
          pink: '#FF9CCB',
          purple: '#D9B8FF',
        },
        pod: {
          alpha: '#FF8A4C',
          beta: '#A5B0FF',
        },
      },
      boxShadow: {
        'hard-2': '2px 2px 0 #15130F',
        'hard-3': '3px 3px 0 #15130F',
        'hard-4': '4px 4px 0 #15130F',
        'hard-5': '5px 5px 0 #15130F',
        'hard-8': '8px 8px 0 #15130F',
        'hard-accent': '3px 3px 0 var(--accent, #4B3DFF)',
        'hard-accent-4': '4px 4px 0 var(--accent, #4B3DFF)',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'sans-serif'],
        title: ['"Bricolage Grotesque"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
