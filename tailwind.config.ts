import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17212B',
        muted: '#667085',
        line: '#E4E8EE',
        canvas: '#F5F7FA',
        brand: {
          50: '#EEF6F6',
          100: '#D9EBE9',
          500: '#397D79',
          600: '#286963',
          700: '#205650'
        }
      },
      boxShadow: {
        soft: '0 12px 32px rgba(17, 24, 39, 0.06)'
      }
    }
  },
  plugins: []
};

export default config;
