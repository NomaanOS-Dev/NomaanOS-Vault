/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Premium Modern Security Workspace Palette
        ivory: '#F7F8F5',
        charcoal: {
          DEFAULT: '#202923',
          subtle: '#3B453E',
        },
        muted: {
          DEFAULT: '#78827B',
          light: '#A2AAA4',
        },
        emerald: {
          DEFAULT: '#168568',
          hover: '#126e56',
          active: '#0f5b47',
          mint: '#E7F4EF',
          border: '#B7E3D6',
        },
        border: {
          subtle: '#E5E9E5',
          medium: '#D4DAD4',
          strong: '#BCC5BD',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F3F5F2',
          active: '#EAECE8',
          card: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#D97706',
          bg: '#FEF3C7',
          border: '#FDE68A',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg: '#FEE2E2',
          border: '#FECACA',
        },
        success: {
          DEFAULT: '#168568',
          bg: '#E7F4EF',
          border: '#B7E3D6',
        },
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(32, 41, 35, 0.04)',
        card: '0 1px 3px 0 rgba(32, 41, 35, 0.05), 0 1px 2px -1px rgba(32, 41, 35, 0.05)',
        cardHover: '0 4px 12px 0 rgba(32, 41, 35, 0.08), 0 2px 4px -1px rgba(32, 41, 35, 0.04)',
        dropdown: '0 10px 25px -5px rgba(32, 41, 35, 0.1), 0 8px 10px -6px rgba(32, 41, 35, 0.1)',
        modal: '0 20px 25px -5px rgba(32, 41, 35, 0.1), 0 8px 10px -6px rgba(32, 41, 35, 0.08)',
      },
    },
  },
  plugins: [],
};

