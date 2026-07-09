/**
 * Helpers for translating the UI's match-format choice into concrete
 * {@link MatchSettings}. Shared by the doubles and tournament setup screens.
 */

import type { MatchSettings } from '../types/match';

/**
 * The mutually-exclusive format options offered on the setup screens:
 * - `'points'`: quick match, first to 2 games (points), max 3 – no sets.
 * - `'bo3'` / `'bo5'`: classic best-of-3 / best-of-5 sets.
 */
export type FormatChoice = 'points' | 'bo3' | 'bo5';

/** Rule toggles that are combined with the format choice. */
export interface RuleToggles {
  goldenPoint: boolean;
  tiebreakEnabled: boolean;
}

/** Number of points needed to win a quick "points" match. */
export const POINTS_MODE_TARGET = 2;

/** Builds the engine {@link MatchSettings} for a given UI format choice. */
export function settingsFromChoice(
  choice: FormatChoice,
  toggles: RuleToggles,
): MatchSettings {
  if (choice === 'points') {
    return {
      // `format` is unused in points mode but kept for a valid settings shape.
      format: 3,
      goldenPoint: toggles.goldenPoint,
      // Tiebreak is irrelevant without sets.
      tiebreakEnabled: false,
      matchType: 'points',
      pointsToWin: POINTS_MODE_TARGET,
    };
  }
  return {
    format: choice === 'bo3' ? 3 : 5,
    goldenPoint: toggles.goldenPoint,
    tiebreakEnabled: toggles.tiebreakEnabled,
    matchType: 'sets',
  };
}
