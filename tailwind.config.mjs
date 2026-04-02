/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0A0A0F',
          soft:    '#141420',
        },
        chalk:  '#F8F7F2',
        accent: {
          DEFAULT: '#FF6826',
          dk:      '#D94E10',
        },
        muted: '#6B6B7B',
      },
      maxWidth: {
        site: '1200px',
      },
      letterSpacing: {
        label: '0.08em',
      },
    },
  },
  plugins: [],
};
