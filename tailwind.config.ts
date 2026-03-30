import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#07080f',
          900: '#0b0c1d',
          800: '#12142b',
          700: '#1b1d3d',
          600: '#2a2d4f',
          500: '#363a62',
        },
        accent: {
          // Primary — electric cyan (Thunderpick/Gemini rec)
          cyan:      '#00e6ff',
          'cyan-dim': '#00b8cc',
          'cyan-glow': '#4df0ff',
          // Secondary — gold (Rollbit/premium)
          gold:      '#ffc800',
          'gold-dim': '#cc9f00',
          'gold-glow': '#ffd740',
          // Keep purple as tertiary for backwards compat
          purple:    '#7b61ff',
          'purple-dim': '#5a44cc',
          'purple-glow': '#9b84ff',
        },
        muted: '#a0a6b2',
        border: '#2a2d4f',
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'sans-serif'],
        sans: ['var(--font-outfit)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        // Cyan glow system
        glow:       '0 0 20px rgba(0, 230, 255, 0.4)',
        'glow-sm':  '0 0 10px rgba(0, 230, 255, 0.25)',
        'glow-lg':  '0 0 35px rgba(0, 230, 255, 0.5)',
        // Gold glow
        'glow-gold':    '0 0 20px rgba(255, 200, 0, 0.4)',
        'glow-gold-sm': '0 0 10px rgba(255, 200, 0, 0.25)',
        // Card base
        card: '0 4px 20px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-space': 'linear-gradient(135deg, #0b0c1d 0%, #1b1d3d 100%)',
        'gradient-card':  'linear-gradient(135deg, #12142b 0%, #1b1d3d 100%)',
        'gradient-hero':  'linear-gradient(135deg, #07080f 0%, #12142b 50%, #1b1d3d 100%)',
        'gradient-gold':  'linear-gradient(90deg, #ffc800 0%, #cc9f00 100%)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 230, 255, 0.25)' },
          '50%':      { boxShadow: '0 0 25px rgba(0, 230, 255, 0.6)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [typography],
}

export default config
