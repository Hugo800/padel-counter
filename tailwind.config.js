/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Vamos Padel Club-inspired palette: a deep padel green (#17593c is
        // the club's primary colour) on near-black surfaces.
        brand: {
          50: '#edf7f1',
          100: '#d3ecdd',
          200: '#a9dabf',
          300: '#74c09b',
          400: '#43a276',
          500: '#23855a',
          600: '#17593c',
          700: '#124a32',
          800: '#0e3a28',
          900: '#0b2c1e',
        },
        // Very dark green-tinted neutrals used for the dark "club" surfaces.
        night: {
          950: '#050807',
          900: '#0a120e',
          800: '#0f1c16',
          700: '#16281f',
        },
        // Override the default (bluish) slate scale with a subtly green-tinted
        // neutral so every surface, text and border shares the padel-green
        // monochrome of the Vamos Padel Club design.
        slate: {
          50: '#f4f8f6',
          100: '#e9f1ec',
          200: '#d4e2da',
          300: '#b3c9bd',
          400: '#8aa899',
          500: '#647d70',
          600: '#48594f',
          700: '#2f3d35',
          800: '#1a271f',
          900: '#101a14',
          950: '#070d0a',
        },
      },
      fontFamily: {
        sans: [
          'Open Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(0, 0, 0, 0.25)',
        'card-dark': '0 10px 30px -12px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.25s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
      },
    },
  },
  plugins: [],
};
