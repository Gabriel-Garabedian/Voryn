/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       'var(--bg)',
        surface:  'var(--surface)',
        card:     'var(--card)',
        border:   'var(--border)',
        accent:   'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        'accent-2':   'var(--accent-2)',
        muted:    'var(--muted)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        success:  '#4ade80',
        warning:  '#facc15',
        danger:   '#f87171',
      },
      fontFamily: {
        display: ['Barlow Condensed', 'Arial Narrow', 'sans-serif'],
        body:    ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        md:    'var(--radius-sm)',
        lg:    'var(--radius-md)',
        xl:    'var(--radius-lg)',
        '2xl': 'var(--radius-xl)',
        '3xl': 'var(--radius-xl)',
        full:  'var(--radius-pill)',
      },
      boxShadow: {
        card:      'var(--shadow-card)',
        'glow':    '0 0 24px rgba(var(--accent-rgb),.35)',
        'glow-sm': '0 0 12px rgba(var(--accent-rgb),.22)',
        'glow-lg': '0 0 48px rgba(var(--accent-rgb),.45)',
      },
      animation: {
        'fade-in':  'fadeIn .25s ease-out',
        'slide-up': 'slideUp .3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 10px rgba(var(--accent-rgb),.2)' }, '50%': { boxShadow: '0 0 30px rgba(var(--accent-rgb),.55)' } },
      }
    }
  },
  plugins: []
}
