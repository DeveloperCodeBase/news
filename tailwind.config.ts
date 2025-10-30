import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui'],
        display: ['var(--font-display)', 'system-ui']
      }
    }
  },
  plugins: []
};

export default config;
