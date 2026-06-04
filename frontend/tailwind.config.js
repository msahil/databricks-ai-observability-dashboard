/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        db: {
          red: '#FF3621',
          navy: '#1B3139',
          orange: '#FF5F46',
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
          },
        },
        platform: {
          databricks: '#FF3621',
          newrelic: '#1CE783',
          servicenow: '#81B5A1',
        },
        status: {
          healthy: '#00A972',
          warning: '#FFAB00',
          critical: '#FF3621',
          info: '#2272B4',
        },
      },
      fontSize: {
        // Minimum readable size for demo / executive audiences (14px)
        xs: ['0.875rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(ellipse 80% 60% at 50% -20%, rgb(255 54 33 / 0.08), transparent)',
        'sidebar-gradient': 'linear-gradient(180deg, #1B3139 0%, #152830 100%)',
      },
      boxShadow: {
        panel: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        kpi: '0 4px 14px 0 rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.06)',
        'kpi-hover': '0 8px 24px 0 rgb(0 0 0 / 0.12), 0 4px 10px -2px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
