import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        foreground: 'var(--foreground)',
        background: 'var(--background)',
        primary: {
          DEFAULT: '#33ff33',
          foreground: '#28272a',
        },
        secondary: {
          DEFAULT: '#28272a',
          foreground: '#E0E0E0',
        },
        destructive: {
          DEFAULT: '#FF494A',
          foreground: '#fff',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      fontFamily: {
        // WumpusMono — place font file at ui/public/fonts/WumpusMono.woff2
        WumpusMono: ['WumpusMono', 'Courier New', 'ui-monospace', 'monospace'],
        sans: ['WumpusMono', 'Courier New', 'ui-monospace', 'monospace'],
        mono: ['WumpusMono', 'Courier New', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Brand uses minimal radius — square/sharp aesthetic
        lg: '0.25rem',
        md: '0.125rem',
        sm: '0px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
