/**
 * Helpers for translating the UI's match-format choice into concrete
 * {@link MatchSettings}. Shared by the doubles and tournament setup screens.
 */

import type { MatchSettings } from '../types/match';

/**
 * The mutually-exclusive format options offered on the setup screens:
 * - `'points'`: quick match, first to 2 games (points), max 3 – no sets.
 * - `'first3'`: first to 3 points, max 5 – no sets (offered in Singles).
 * - `'bo3'` / `'bo5'`: classic best-of-3 / best-of-5 sets.
 */
export type FormatChoice = 'points' | 'first3' | 'bo3' | 'bo5';

/** Rule toggles that are combined with the format choice. */
export interface RuleToggles {
  goldenPoint: boolean;
  tiebreakEnabled: boolean;
}

/** Number of points needed to win a quick "points" match. */
export const POINTS_MODE_TARGET = 2;

/** Number of points needed to win a "First to 3" match. */
export const FIRST_TO_THREE_TARGET = 3;

/**
 * Points target per set-less format choice. Used both to build the engine
 * settings and to keep the UI copy ("First to N points") in sync.
 */
const POINTS_TARGETS: Partial<Record<FormatChoice, number>> = {
  points: POINTS_MODE_TARGET,
  first3: FIRST_TO_THREE_TARGET,
};

/**
 * True when the choice describes a set-less "points" match. Callers use this
 * to hide set-only options (e.g. the 6-6 tiebreak toggle).
 */
export function isPointsChoice(choice: FormatChoice): boolean {
  return choice in POINTS_TARGETS;
}

/** Builds the engine {@link MatchSettings} for a given UI format choice. */
export function settingsFromChoice(
  choice: FormatChoice,
  toggles: RuleToggles,
): MatchSettings {
  const pointsTarget = POINTS_TARGETS[choice];
  if (pointsTarget !== undefined) {
    return {
      // `format` is unused in points mode but kept for a valid settings shape.
      format: 3,
      goldenPoint: toggles.goldenPoint,
      // Tiebreak is irrelevant without sets.
      tiebreakEnabled: false,
      matchType: 'points',
      pointsToWin: pointsTarget,
    };
  }
  return {
    format: choice === 'bo3' ? 3 : 5,
    goldenPoint: toggles.goldenPoint,
    tiebreakEnabled: toggles.tiebreakEnabled,
    matchType: 'sets',
  };
}

/**
 * The inverse of {@link settingsFromChoice}: recovers the UI format choice
 * from stored {@link MatchSettings}. Used to pre-fill the setup screen with
 * the previous match's format so a rematch needs no re-typing.
 *
 * Settings written by an older version (or by a format that no longer exists)
 * fall back to the closest match, never to `undefined`.
 */
export function choiceFromSettings(settings: MatchSettings): FormatChoice {
  if (settings.matchType === 'points') {
    return settings.pointsToWin === FIRST_TO_THREE_TARGET ? 'first3' : 'points';
  }
  return settings.format === 5 ? 'bo5' : 'bo3';
}
