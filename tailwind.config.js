/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['"Chakra Petch"', '"Be Vietnam Pro"', 'sans-serif'],
      },
      boxShadow: {
        'glow-blue': '0 0 24px -4px rgba(56, 189, 248, 0.45)',
        'glow-purple': '0 0 28px -4px rgba(168, 85, 247, 0.45)',
        'glow-gold': '0 0 28px -4px rgba(250, 204, 21, 0.45)',
        'glow-emerald': '0 0 20px -4px rgba(16, 185, 129, 0.45)',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
      animation: {
        'float-slow': 'floatSlow 3.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
