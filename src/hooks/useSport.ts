import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

/** The two racket sports the scoreboard supports. */
export type Sport = 'tennis' | 'padel';

/** Human-readable labels, used for headings and the document title. */
export const SPORT_LABEL: Record<Sport, string> = {
  tennis: 'Tennis',
  padel: 'Padel',
};

/** Every class this hook may put on `<html>`, so switching can clear them. */
const SPORT_CLASSES: Record<Sport, string> = {
  tennis: 'sport-tennis',
  padel: 'sport-padel',
};

export const SPORT_STORAGE_KEY = 'padel-score:sport';

/**
 * Colour of the browser/OS chrome around the app, per sport. Matches
 * `--brand-600` so the status bar continues the page instead of contrasting
 * with it - the most visible difference on a phone, and the reason the same
 * values are duplicated in the pre-paint script in `index.html`.
 */
const SPORT_THEME_COLOR: Record<Sport, string> = {
  tennis: '#a84424',
  padel: '#17593c',
};

/** Neutral chrome colour while no sport has been picked. */
const DEFAULT_THEME_COLOR = '#17593c';

export interface UseSport {
  /** The chosen sport, or `null` while the picker should be shown. */
  sport: Sport | null;
  /** Picks a sport (persisted, applies the theme immediately). */
  chooseSport: (sport: Sport) => void;
  /** Forgets the choice so the picker appears again. */
  clearSport: () => void;
}

/**
 * Remembers which sport the user picked on the landing screen and reflects it
 * on the `<html>` element as `sport-tennis` / `sport-padel`.
 *
 * The class drives the CSS custom properties in `index.css`, which in turn feed
 * Tailwind's `brand`/`night`/`slate` scales – so one class swap re-skins the
 * whole app between the clay-court and artificial-turf looks.
 *
 * Returns `null` until a choice was made, which is what makes the picker the
 * first screen for new visitors.
 */
export function useSport(): UseSport {
  const [sport, setSport] = useLocalStorage<Sport | null>(
    SPORT_STORAGE_KEY,
    null,
  );

  useEffect(() => {
    const root = document.documentElement;
    // Drop both classes first so switching never leaves a stale theme behind.
    root.classList.remove(SPORT_CLASSES.tennis, SPORT_CLASSES.padel);
    if (sport) root.classList.add(SPORT_CLASSES[sport]);
  }, [sport]);

  useEffect(() => {
    document.title = sport
      ? `${SPORT_LABEL[sport]} Score`
      : 'Tennis & Padel Score';
  }, [sport]);

  // Follow the sport into the browser chrome and the tab/home-screen icon.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (meta) {
      meta.content = sport ? SPORT_THEME_COLOR[sport] : DEFAULT_THEME_COLOR;
    }
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = `/${sport ?? 'padel'}.svg`;
  }, [sport]);

  const chooseSport = useCallback((next: Sport) => setSport(next), [setSport]);
  const clearSport = useCallback(() => setSport(null), [setSport]);

  return { sport, chooseSport, clearSport };
}
