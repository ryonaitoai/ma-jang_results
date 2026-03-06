import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy aliases (for gradual migration)
        mahjong: {
          primary: '#1a472a',
          surface: '#0f2418',
          card: '#163020',
          accent: '#44ff88',
          warning: '#ff9900',
          error: '#ff4444',
          text: '#f0f0e8',
          muted: '#6b8068',
        },
        // New design system colors
        felt: {
          900: '#0a1a10',
          800: '#0f2418',
          700: '#163020',
          600: '#1e3d2a',
          500: '#2a5438',
        },
        game: {
          white: '#f0f0e8',
          gold: '#ffd700',
          red: '#ff4444',
          cyan: '#00e5ff',
          green: '#44ff88',
          orange: '#ff9900',
          muted: '#6b8068',
          dim: '#3d5c45',
        },
        frame: {
          outer: '#4a7a5a',
          inner: '#2a4a34',
          glow: '#44ff8844',
        },
      },
      fontFamily: {
        game: ['"M PLUS 1"', 'sans-serif'],
        mono: ['"M PLUS 1 Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'slide-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'score-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'flash-gold': {
          '0%': { color: '#ffd700', textShadow: '0 0 8px rgba(255,215,0,0.6)' },
          '100%': { color: 'inherit', textShadow: 'none' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'slide-in-down': 'slide-in-down 0.3s ease-out',
        'score-pop': 'score-pop 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out both',
        'flash-gold': 'flash-gold 0.4s ease-out',
        blink: 'blink 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
