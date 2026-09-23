import { describe, expect, it } from 'vitest';
import {
  FIRST_TO_THREE_TARGET,
  POINTS_MODE_TARGET,
  choiceFromSettings,
  isPointsChoice,
  settingsFromChoice,
  type FormatChoice,
} from '../lib/format';
import { awardPoint, createInitialState } from '../lib/scoring';
import type { MatchConfig, MatchState, TeamId } from '../types/match';

const TOGGLES = { goldenPoint: false, tiebreakEnabled: true };

/** Wins `count` love games for `team`. */
function winGames(state: MatchState, team: TeamId, count: number): MatchState {
  let s = state;
  for (let i = 0; i < count; i++) {
    for (let p = 0; p < 4; p++) s = awardPoint(s, team);
  }
  return s;
}

describe('settingsFromChoice', () => {
  it('maps the quick format to a first-to-2 points match', () => {
    const settings = settingsFromChoice('points', TOGGLES);
    expect(settings.matchType).toBe('points');
    expect(settings.pointsToWin).toBe(POINTS_MODE_TARGET);
    // Sets-only rules are switched off without sets.
    expect(settings.tiebreakEnabled).toBe(false);
  });

  it('maps "First to 3" to a first-to-3 points match', () => {
    const settings = settingsFromChoice('first3', TOGGLES);
    expect(settings.matchType).toBe('points');
    expect(settings.pointsToWin).toBe(FIRST_TO_THREE_TARGET);
    expect(settings.tiebreakEnabled).toBe(false);
  });

  it('maps best-of choices to set-based matches', () => {
    expect(settingsFromChoice('bo3', TOGGLES)).toMatchObject({
      matchType: 'sets',
      format: 3,
      tiebreakEnabled: true,
    });
    expect(settingsFromChoice('bo5', TOGGLES)).toMatchObject({
      matchType: 'sets',
      format: 5,
    });
  });

  it('keeps the golden-point toggle in every format', () => {
    const toggles = { goldenPoint: true, tiebreakEnabled: false };
    expect(settingsFromChoice('first3', toggles).goldenPoint).toBe(true);
    expect(settingsFromChoice('bo3', toggles).goldenPoint).toBe(true);
  });
});

describe('choiceFromSettings', () => {
  it('round-trips every format choice', () => {
    const choices: FormatChoice[] = ['points', 'first3', 'bo3', 'bo5'];
    for (const choice of choices) {
      expect(choiceFromSettings(settingsFromChoice(choice, TOGGLES))).toBe(
        choice,
      );
    }
  });

  it('treats settings without a matchType as set-based', () => {
    // Matches stored before `matchType` existed default to sets.
    expect(
      choiceFromSettings({
        format: 5,
        goldenPoint: false,
        tiebreakEnabled: true,
      }),
    ).toBe('bo5');
  });
});

describe('isPointsChoice', () => {
  it('is true only for the set-less formats', () => {
    expect(isPointsChoice('points')).toBe(true);
    expect(isPointsChoice('first3')).toBe(true);
    expect(isPointsChoice('bo3')).toBe(false);
    expect(isPointsChoice('bo5')).toBe(false);
  });
});

describe('First to 3 end-to-end', () => {
  const config: MatchConfig = {
    teams: {
      A: { name: 'Player 1', players: ['', ''] },
      B: { name: 'Player 2', players: ['', ''] },
    },
    settings: settingsFromChoice('first3', TOGGLES),
    firstServer: 'A',
  };

  it('needs three points and ignores anything after', () => {
    let state = createInitialState(config);
    state = winGames(state, 'A', 2); // 2-0
    state = winGames(state, 'B', 1); // 2-1
    expect(state.winner).toBeNull();
    state = winGames(state, 'A', 1); // 3-1 → decided
    expect(state.games).toEqual({ A: 3, B: 1 });
    expect(state.winner).toBe('A');
    // No sets are ever recorded in a points-mode match.
    expect(state.completedSets).toEqual([]);
    expect(awardPoint(state, 'B')).toBe(state);
  });
});
