/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/ui/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        'surface-primary': '#0d111d',
        'surface-elevated': '#121827',
        'accent-glow': '#7c3aed',
        'danger-streak-break': '#fb923c',
        'xp-gold': '#facc15',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'border-default': '#334155',
      },
      boxShadow: {
        glow: '0 28px 80px rgba(124, 58, 237, 0.22)',
        panel: '0 32px 90px rgba(15, 23, 42, 0.35)',
      },
      transitionTimingFunction: {
        pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
