/**
 * The two team colours, in one place.
 *
 * Team A wears the sport's brand colour, team B a deliberately distant
 * counter-colour. Both resolve through CSS custom properties (see
 * `index.css`), so the pair stays far apart in either sport: green vs crimson
 * on padel's turf, terracotta vs blue on tennis' clay.
 *
 * Keeping the class strings here rather than in each component guarantees the
 * scoreboard, the watch layout, the serve badge and the setup form cannot
 * drift apart — and makes the contrast decision reviewable in a single file.
 */

/** Which of the two teams a surface belongs to. */
export type TeamAccent = 'a' | 'b';

interface AccentClasses {
  /** Large score numerals on a card surface. */
  text: string;
  /** The dominant "add a point" surface; white text sits on it. */
  button: string;
  /** Ring + glow lifting the card of the team that is serving. */
  serveRing: string;
  /** The "Serving" pill. */
  badge: string;
  /** Small solid dot (serve ball, setup marker). */
  dot: string;
  /** Focus ring for form fields belonging to this team. */
  focusRing: string;
  /** Watch layout: muted row tint and its pressed state. */
  watchRow: string;
  /** Watch layout: score numerals and dot on the dark frame. */
  watchText: string;
  /** Watch layout: ring around the serving row. */
  watchServeRing: string;
}

export const TEAM_ACCENT: Record<TeamAccent, AccentClasses> = {
  a: {
    text: 'text-brand-600 dark:text-brand-400',
    button: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 shadow-brand-600/30',
    serveRing: 'ring-2 ring-brand-500 shadow-lg shadow-brand-600/25 dark:ring-brand-400',
    badge: 'bg-brand-600/15 text-brand-700 ring-brand-500/40 dark:text-brand-300',
    dot: 'bg-brand-500',
    focusRing: 'focus:ring-brand-500',
    watchRow: 'bg-brand-600/15 active:bg-brand-600/25',
    watchText: 'text-brand-400',
    watchServeRing: 'ring-1 ring-brand-400/70',
  },
  b: {
    text: 'text-teamb-600 dark:text-teamb-400',
    button: 'bg-teamb-600 hover:bg-teamb-700 active:bg-teamb-800 shadow-teamb-600/30',
    serveRing: 'ring-2 ring-teamb-500 shadow-lg shadow-teamb-600/25 dark:ring-teamb-400',
    badge: 'bg-teamb-600/15 text-teamb-700 ring-teamb-500/40 dark:text-teamb-300',
    dot: 'bg-teamb-500',
    focusRing: 'focus:ring-teamb-500',
    watchRow: 'bg-teamb-600/15 active:bg-teamb-600/25',
    watchText: 'text-teamb-400',
    watchServeRing: 'ring-1 ring-teamb-400/70',
  },
};
