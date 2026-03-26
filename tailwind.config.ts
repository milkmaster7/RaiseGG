import type { Config } from 'tailwindcss'

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
          950: '#07070f',
          900: '#0d0d1a',
          800: '#12122a',
          700: '#1a1a3e',
          600: '#22224e',
          500: '#2a2a5e',
        },
        accent: {
          purple: '#7b61ff',
          'purple-dim': '#5a44cc',
          'purple-glow': '#9b84ff',
          cyan: '#00d4ff',
          'cyan-dim': '#0099cc',
        },
        muted: '#a0a0c0',
        border: '#2a2a4a',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(123, 97, 255, 0.4)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.4)',
        'glow-sm': '0 0 10px rgba(123, 97, 255, 0.25)',
      },
      backgroundImage: {
        'gradient-space': 'linear-gradient(135deg, #0d0d1a 0%, #1a1a3e 100%)',
        'gradient-card': 'linear-gradient(135deg, #12122a 0%, #1a1a3e 100%)',
        'gradient-hero': 'linear-gradient(135deg, #07070f 0%, #12122a 50%, #1a1a3e 100%)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(123, 97, 255, 0.25)' },
          '50%': { boxShadow: '0 0 25px rgba(123, 97, 255, 0.6)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
