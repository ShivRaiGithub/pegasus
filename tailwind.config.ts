import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        cardHover: 'var(--color-card-hover)',
        border: 'var(--color-border)',
        borderStrong: 'var(--color-border-strong)',
        textPrimary: 'var(--color-text-primary)',
        textSecondary: 'var(--color-text-secondary)',
        textTertiary: 'var(--color-text-tertiary)',
        accent: 'var(--color-accent)',
        accentHover: 'var(--color-accent-hover)',
        accentLight: 'var(--color-accent-light)',
        success: 'var(--color-success)',
        successLight: 'var(--color-success-light)',
        error: 'var(--color-error)',
        errorLight: 'var(--color-error-light)',
        warning: 'var(--color-warning)',
        warningLight: 'var(--color-warning-light)',
      },
    },
  },
  plugins: [],
};

export default config;
