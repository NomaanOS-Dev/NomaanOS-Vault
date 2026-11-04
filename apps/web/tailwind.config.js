/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0a0f1d',
          sidebar: '#0f172a',
          surface: '#131d31',
          card: '#162036',
          input: '#0e1628',
          border: '#1f2e4d',
          borderLight: '#2b3f66',
          primary: '#2563eb',
          primaryHover: '#1d4ed8',
          text: '#f8fafc',
          textMuted: '#94a3b8',
          textDim: '#64748b',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
        },
      },
    },
  },
  plugins: [],
};

