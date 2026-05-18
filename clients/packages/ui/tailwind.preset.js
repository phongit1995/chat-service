/** @type {import('tailwindcss').Config} */
export default {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
      colors: {
        primary: {
          100: '#FCE7F3',
          200: '#FBCFE8',
          400: '#EC4899',
          500: '#DD2A7B',
          600: '#C2185B',
          700: '#A21458',
          DEFAULT: '#DD2A7B',
        },
        accent: {
          orange: '#F58529',
          yellow: '#FEDA77',
          purple: '#8134AF',
          blue:   '#515BD4',
          coral:  '#FF6B6B',
        },
        ink: {
          primary:    '#1A1421',
          secondary:  '#5A4F66',
          tertiary:   '#8E8499',
          disabled:   '#C4BCC9',
        },
        surface: {
          base:     '#FFFBFC',
          DEFAULT:  '#FFFFFF',
          elevated: '#FAF7F8',
          overlay:  '#F4EFF1',
          tinted:   '#FDF2F8',
        },
        line: {
          subtle:  '#F4EFF1',
          DEFAULT: '#E8DDE2',
          strong:  '#C4BCC9',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          danger:  '#EF4444',
          info:    '#3B82F6',
          like:    '#FF3B5C',
        },
        call: {
          accept:  '#10B981',
          decline: '#EF4444',
          mute:    '#8E8499',
          bg:      '#1A1421',
        },
      },
      borderRadius: {
        sm:    '8px',
        md:    '12px',
        lg:    '16px',
        xl:    '24px',
        '2xl': '32px',
      },
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(221,42,123,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'soft-md': '0 4px 12px rgba(221,42,123,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'soft-lg': '0 8px 24px rgba(221,42,123,0.12), 0 4px 8px rgba(0,0,0,0.06)',
        'soft-xl': '0 16px 40px rgba(221,42,123,0.16), 0 8px 16px rgba(0,0,0,0.08)',
        'glow-gradient': '0 8px 24px rgba(221,42,123,0.35), 0 4px 12px rgba(245,133,41,0.25)',
        'glow-like':     '0 0 20px rgba(255,59,92,0.4)',
      },
      backgroundImage: {
        'gradient-signature':
          'linear-gradient(135deg, #FEDA77 0%, #F58529 25%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%)',
        'gradient-warm': 'linear-gradient(135deg, #FEDA77, #F58529, #DD2A7B)',
        'gradient-cool': 'linear-gradient(135deg, #DD2A7B, #8134AF, #515BD4)',
        'gradient-soft': 'linear-gradient(135deg, #FFF1E6, #FFE0EC, #F0E6FF)',
      },
      transitionTimingFunction: {
        'ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-spring': 'cubic-bezier(0.5, 1.25, 0.5, 1)',
      },
      transitionDuration: {
        instant: '100ms',
        fast:    '200ms',
        normal:  '300ms',
        slow:    '500ms',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(120%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        slideInRight: 'slideInRight 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        slideInUp: 'slideInUp 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
};
