import type { Config } from 'tailwindcss';
const preset = require('./tailwind.preset');

const config: Config = {
  presets: [preset],
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Keep Cascadia brand colors for this project
        cascadia: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        status: {
          success: '#059669',
          warning: '#d97706',
          error: '#dc2626',
          info: '#0284c7',
        },
      },
    },
  },
  plugins: [],
};

export default config;
