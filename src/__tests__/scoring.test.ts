import { describe, expect, it } from 'vitest';
import {
  awardPoint,
  createInitialState,
  getPointLabel,
  hasAdvantage,
  isDeuce,
  isPointsMode,
  otherTeam,
  pointsToWin,
  setsToWin,
  tiebreakServer,
} from '../lib/scoring';
import type { MatchConfig, MatchState, TeamId } from '../types/match';

/** Builds a match config with sensible defaults for tests. */
function makeConfig(overrides: Partial<MatchConfig['settings']> = {}): MatchConfig {
  return {
    teams: {
      A: { name: 'Team A', players: ['A1', 'A2'] },
      B: { name: 'Team B', players: ['B1', 'B2'] },
    },
    settings: {
      format: 3,
      goldenPoint: false,
      tiebreakEnabled: true,
      ...overrides,
    },
    firstServer: 'A',
  };
}

/** Awards a sequence of points and returns the resulting state. */
function play(state: MatchState, sequence: TeamId[]): MatchState {
  return sequence.reduce((s, team) => awardPoint(s, team), state);
}

/** Wins `count` full games for `team` (assumes love games are possible). */
function winGames(state: MatchState, team: TeamId, count: number): MatchState {
  let s = state;
  for (let i = 0; i < count; i++) {
    s = play(s, [team, team, team, team]);
  }
  return s;
}

describe('helpers', () => {
  it('otherTeam returns the opponent', () => {
    expect(otherTeam('A')).toBe('B');
    expect(otherTeam('B')).toBe('A');
  });

  it('setsToWin depends on format', () => {
    expect(setsToWin(3)).toBe(2);
    expect(setsToWin(5)).toBe(3);
  });
});

describe('createInitialState', () => {
  it('initialises a clean scoreboard', () => {
    const state = createInitialState(makeConfig());
    expect(state.points).toEqual({ A: 0, B: 0 });
    expect(state.games).toEqual({ A: 0, B: 0 });
    expect(state.sets).toEqual({ A: 0, B: 0 });
    expect(state.completedSets).toEqual([]);
    expect(state.tiebreak).toBeNull();
    expect(state.winner).toBeNull();
    expect(state.server).toBe('A');
  });
});

describe('point progression', () => {
  it('follows 0 → 15 → 30 → 40', () => {
    let state = createInitialState(makeConfig());
    expect(getPointLabel(state, 'A')).toBe('0');
    state = awardPoint(state, 'A');
    expect(getPointLabel(state, 'A')).toBe('15');
    state = awardPoint(state, 'A');
    expect(getPointLabel(state, 'A')).toBe('30');
    state = awardPoint(state, 'A');
    expect(getPointLabel(state, 'A')).toBe('40');
  });

  it('wins a love game and switches server', () => {
    let state = createInitialState(makeConfig());
    state = play(state, ['A', 'A', 'A', 'A']);
    expect(state.games).toEqual({ A: 1, B: 0 });
    expect(state.points).toEqual({ A: 0, B: 0 });
    expect(state.server).toBe('B');
  });
});

describe('deuce and advantage (Golden Point OFF)', () => {
  it('reaches deuce at 40-40', () => {
    let state = createInitialState(makeConfig({ goldenPoint: false }));
    state = play(state, ['A', 'A', 'A', 'B', 'B', 'B']);
    expect(isDeuce(state)).toBe(true);
    expect(getPointLabel(state, 'A')).toBe('40');
    expect(getPointLabel(state, 'B')).toBe('40');
  });

  it('shows advantage and requires a two-point lead', () => {
    let state = createInitialState(makeConfig({ goldenPoint: false }));
    state = play(state, ['A', 'A', 'A', 'B', 'B', 'B']); // deuce
    state = awardPoint(state, 'A'); // advantage A
    expect(hasAdvantage(state, 'A')).toBe(true);
    expect(getPointLabel(state, 'A')).toBe('AD');
    expect(state.games.A).toBe(0);

    state = awardPoint(state, 'B'); // back to deuce
    expect(isDeuce(state)).toBe(true);

    state = play(state, ['A', 'A']); // A wins from deuce
    expect(state.games.A).toBe(1);
    expect(state.points).toEqual({ A: 0, B: 0 });
  });
});

describe('golden point (No-Ad)', () => {
  it('decides the game on a single point at deuce', () => {
    let state = createInitialState(makeConfig({ goldenPoint: true }));
    state = play(state, ['A', 'A', 'A', 'B', 'B', 'B']); // 40-40
    expect(state.games).toEqual({ A: 0, B: 0 });
    state = awardPoint(state, 'B'); // golden point → B wins game
    expect(state.games.B).toBe(1);
    expect(state.points).toEqual({ A: 0, B: 0 });
  });
});

describe('set completion', () => {
  it('wins a set 6-0', () => {
    let state = createInitialState(makeConfig());
    state = winGames(state, 'A', 6);
    expect(state.sets.A).toBe(1);
    expect(state.completedSets).toHaveLength(1);
    expect(state.completedSets[0]).toMatchObject({ A: 6, B: 0, tiebreak: false });
    expect(state.games).toEqual({ A: 0, B: 0 });
  });

  it('requires a two-game lead (7-5)', () => {
    let state = createInitialState(makeConfig());
    state = winGames(state, 'A', 5);
    state = winGames(state, 'B', 5);
    expect(state.games).toEqual({ A: 5, B: 5 });
    state = winGames(state, 'A', 1); // 6-5, no set yet
    expect(state.sets.A).toBe(0);
    state = winGames(state, 'A', 1); // 7-5, set won
    expect(state.sets.A).toBe(1);
    expect(state.completedSets[0]).toMatchObject({ A: 7, B: 5 });
  });
});

describe('tiebreak', () => {
  it('starts a tiebreak at 6-6 when enabled', () => {
    let state = createInitialState(makeConfig({ tiebreakEnabled: true }));
    state = winGames(state, 'A', 6);
    // reset by winning 6 for B on a fresh set is complex; instead build 5-5
    state = createInitialState(makeConfig({ tiebreakEnabled: true }));
    state = winGames(state, 'A', 5);
    state = winGames(state, 'B', 5);
    state = winGames(state, 'A', 1);
    state = winGames(state, 'B', 1); // 6-6
    expect(state.tiebreak).not.toBeNull();
    expect(state.games).toEqual({ A: 6, B: 6 });
  });

  it('wins the set 7-6 via a 7-point tiebreak', () => {
    let state = createInitialState(makeConfig({ tiebreakEnabled: true }));
    state = winGames(state, 'A', 5);
    state = winGames(state, 'B', 5);
    state = winGames(state, 'A', 1);
    state = winGames(state, 'B', 1); // 6-6 → tiebreak
    state = play(state, ['A', 'A', 'A', 'A', 'A', 'A', 'A']); // 7-0
    expect(state.sets.A).toBe(1);
    expect(state.tiebreak).toBeNull();
    expect(state.completedSets[0]).toMatchObject({ A: 7, B: 6, tiebreak: true });
  });

  it('requires a two-point lead in the tiebreak', () => {
    let state = createInitialState(makeConfig({ tiebreakEnabled: true }));
    state = winGames(state, 'A', 5);
    state = winGames(state, 'B', 5);
    state = winGames(state, 'A', 1);
    state = winGames(state, 'B', 1); // 6-6 → tiebreak
    // 6-6 in the tiebreak
    state = play(state, [
      'A', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'A', 'B', 'A', 'B',
    ]);
    expect(state.tiebreak).toMatchObject({ A: 6, B: 6 });
    state = awardPoint(state, 'A'); // 7-6, not enough
    expect(state.sets.A).toBe(0);
    state = awardPoint(state, 'A'); // 8-6, set won
    expect(state.sets.A).toBe(1);
  });

  it('plays an advantage set when tiebreak is disabled', () => {
    let state = createInitialState(makeConfig({ tiebreakEnabled: false }));
    state = winGames(state, 'A', 5);
    state = winGames(state, 'B', 5);
    state = winGames(state, 'A', 1);
    state = winGames(state, 'B', 1); // 6-6, no tiebreak
    expect(state.tiebreak).toBeNull();
    expect(state.sets).toEqual({ A: 0, B: 0 });
    state = winGames(state, 'A', 2); // 8-6
    expect(state.sets.A).toBe(1);
    expect(state.completedSets[0]).toMatchObject({ A: 8, B: 6 });
  });
});

describe('tiebreak serving rotation', () => {
  it('follows standard tennis order', () => {
    // Starter serves point 1, then service alternates every two points.
    expect(tiebreakServer('A', 1)).toBe('A');
    expect(tiebreakServer('A', 2)).toBe('B');
    expect(tiebreakServer('A', 3)).toBe('B');
    expect(tiebreakServer('A', 4)).toBe('A');
    expect(tiebreakServer('A', 5)).toBe('A');
    expect(tiebreakServer('A', 6)).toBe('B');
    expect(tiebreakServer('A', 7)).toBe('B');
  });
});

describe('match completion', () => {
  it('best of 3: first to 2 sets wins', () => {
    let state = createInitialState(makeConfig({ format: 3 }));
    // Set 1 to A
    state = winGames(state, 'A', 6);
    expect(state.winner).toBeNull();
    // Set 2 to A
    state = winGames(state, 'A', 6);
    expect(state.sets.A).toBe(2);
    expect(state.winner).toBe('A');
  });

  it('best of 5: first to 3 sets wins', () => {
    let state = createInitialState(makeConfig({ format: 5 }));
    state = winGames(state, 'A', 6);
    state = winGames(state, 'A', 6);
    expect(state.winner).toBeNull();
    state = winGames(state, 'A', 6);
    expect(state.sets.A).toBe(3);
    expect(state.winner).toBe('A');
  });

  it('ignores points once the match is over', () => {
    let state = createInitialState(makeConfig({ format: 3 }));
    state = winGames(state, 'A', 6);
    state = winGames(state, 'A', 6);
    const finished = state;
    state = awardPoint(state, 'B');
    expect(state).toBe(finished); // unchanged reference
  });
});

describe('serve rotation across a set', () => {
  it('alternates server after every game', () => {
    let state = createInitialState(makeConfig());
    expect(state.server).toBe('A');
    state = winGames(state, 'A', 1);
    expect(state.server).toBe('B');
    state = winGames(state, 'B', 1);
    expect(state.server).toBe('A');
  });
});

describe('points mode (short match)', () => {
  const pointsConfig = () =>
    makeConfig({ matchType: 'points', pointsToWin: 2, goldenPoint: true });

  it('helpers report points mode and target', () => {
    const settings = pointsConfig().settings;
    expect(isPointsMode(settings)).toBe(true);
    expect(pointsToWin(settings)).toBe(2);
  });

  it('defaults sets-mode settings to a target of 2', () => {
    const settings = makeConfig().settings;
    expect(isPointsMode(settings)).toBe(false);
    expect(pointsToWin(settings)).toBe(2);
  });

  it('counts each won game as a point without creating sets', () => {
    let state = createInitialState(pointsConfig());
    state = winGames(state, 'A', 1);
    expect(state.games).toEqual({ A: 1, B: 0 });
    expect(state.sets).toEqual({ A: 0, B: 0 });
    expect(state.completedSets).toEqual([]);
    expect(state.winner).toBeNull();
    // server still rotates after each game
    expect(state.server).toBe('B');
  });

  it('first team to 2 points wins the match (max 3 games)', () => {
    let state = createInitialState(pointsConfig());
    state = winGames(state, 'A', 1); // 1-0
    state = winGames(state, 'B', 1); // 1-1
    expect(state.winner).toBeNull();
    state = winGames(state, 'A', 1); // 2-1 → match over
    expect(state.games).toEqual({ A: 2, B: 1 });
    expect(state.winner).toBe('A');
  });

  it('can be won 2-0', () => {
    let state = createInitialState(pointsConfig());
    state = winGames(state, 'B', 2);
    expect(state.winner).toBe('B');
    expect(state.games).toEqual({ A: 0, B: 2 });
  });

  it('ignores further points once decided', () => {
    let state = createInitialState(pointsConfig());
    state = winGames(state, 'A', 2);
    const finished = state;
    state = awardPoint(state, 'B');
    expect(state).toBe(finished);
  });
});
