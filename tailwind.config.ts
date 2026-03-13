import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#111118',
        border: '#1e1e2e',
        textPrimary: '#e2e2f0',
        textSecondary: '#6b6b8a',
        accent: '#4f6ef7',
        success: '#22c55e',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
};

export default config;
