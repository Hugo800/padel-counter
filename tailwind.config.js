/** @type {import('tailwindcss').Config} */

/**
 * Builds a Tailwind colour scale whose shades read from CSS custom properties,
 * e.g. `cssVarScale('brand', [500])` → `{ 500: 'rgb(var(--brand-500) / <alpha-value>)' }`.
 *
 * @param {string} name   Variable prefix (`brand`, `night`, `slate`).
 * @param {number[]} shades Shade numbers to generate.
 */
function cssVarScale(name, shades) {
  return Object.fromEntries(
    shades.map((shade) => [
      shade,
      `rgb(var(--${name}-${shade}) / <alpha-value>)`,
    ]),
  );
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Every palette below resolves through CSS custom properties (defined
        // in `src/index.css`) instead of fixed hex values. That lets the whole
        // app re-skin itself per sport: padel keeps the green artificial-turf
        // look, tennis switches to a terracotta clay-court palette – without a
        // single utility class changing anywhere in the components.
        //
        // The `<alpha-value>` placeholder keeps Tailwind's `/50` opacity
        // modifiers working, which requires the variables to hold bare
        // "R G B" channel triplets.
        brand: cssVarScale('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        // Very dark, sport-tinted neutrals used for the dark "club" surfaces.
        // Team B's colour. Team A uses `brand`, so these two must stay far
        // apart in both sports - see src/lib/teamAccent.ts.
        teamb: cssVarScale('teamb', [300, 400, 500, 600, 700, 800]),
        night: cssVarScale('night', [700, 800, 900, 950]),
        // Overrides the default (bluish) slate scale with a sport-tinted
        // neutral so every surface, text and border shares the same monochrome.
        slate: cssVarScale('slate', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
      },
      screens: {
        // Phone held sideways at the net: plenty of width, almost no height.
        // Declared in `extend` so these utilities are emitted after sm/md/lg
        // and therefore win wherever both apply.
        short: { raw: '(max-height: 520px) and (orientation: landscape)' },
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
