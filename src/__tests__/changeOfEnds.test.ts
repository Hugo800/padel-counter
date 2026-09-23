import { describe, expect, it } from 'vitest';
import {
  awardPoint,
  canChooseFirstServer,
  changeOfEndsKey,
  createInitialState,
  isChangeOfEndsDue,
} from '../lib/scoring';
import { settingsFromChoice } from '../lib/format';
import type { MatchConfig, MatchState, TeamId } from '../types/match';

const TOGGLES = { goldenPoint: false, tiebreakEnabled: true };

function config(choice: Parameters<typeof settingsFromChoice>[0]): MatchConfig {
  return {
    teams: {
      A: { name: 'A', players: ['', ''] },
      B: { name: 'B', players: ['', ''] },
    },
    settings: settingsFromChoice(choice, TOGGLES),
    firstServer: 'A',
  };
}

/** Plays one love game for `team`. */
function playGame(state: MatchState, team: TeamId): MatchState {
  let s = state;
  for (let p = 0; p < 4; p++) s = awardPoint(s, team);
  return s;
}

/** Plays `count` love games for `team` in a row. */
function winGames(state: MatchState, team: TeamId, count: number): MatchState {
  let s = state;
  for (let i = 0; i < count; i++) s = playGame(s, team);
  return s;
}

/** Plays out a whole sequence of game winners, in order. */
function playGames(state: MatchState, winners: TeamId[]): MatchState {
  return winners.reduce(playGame, state);
}

/** Alternating winners, so a set can be walked up to 6-6 without ending. */
const ALTERNATING: TeamId[] = Array.from({ length: 12 }, (_, i) =>
  i % 2 === 0 ? 'A' : 'B',
);

describe('isChangeOfEndsDue', () => {
  it('is false before the match has started', () => {
    expect(isChangeOfEndsDue(createInitialState(config('bo3')))).toBe(false);
  });

  it('follows the odd-game rule inside a set', () => {
    let s = createInitialState(config('bo3'));
    s = winGames(s, 'A', 1); // 1-0, odd -> change
    expect(isChangeOfEndsDue(s)).toBe(true);
    s = winGames(s, 'B', 1); // 1-1, even -> no
    expect(isChangeOfEndsDue(s)).toBe(false);
    s = winGames(s, 'A', 1); // 2-1, odd -> change
    expect(isChangeOfEndsDue(s)).toBe(true);
  });

  it('never fires mid-game', () => {
    let s = createInitialState(config('bo3'));
    s = winGames(s, 'A', 1);
    expect(isChangeOfEndsDue(s)).toBe(true);
    s = awardPoint(s, 'B'); // a point of the next game is under way
    expect(isChangeOfEndsDue(s)).toBe(false);
  });

  it('fires after a set that finished on an odd number of games', () => {
    // B takes the opening game, then A runs out the set: 6-1 = 7 games (odd).
    let s = createInitialState(config('bo3'));
    s = playGames(s, ['B']);
    s = winGames(s, 'A', 6);
    expect(s.completedSets).toHaveLength(1);
    expect(s.games).toEqual({ A: 0, B: 0 });
    expect(isChangeOfEndsDue(s)).toBe(true);
  });

  it('stays quiet after a set with an even number of games', () => {
    // B takes the first two, then A runs out the set: 6-2 = 8 games (even).
    let s = createInitialState(config('bo3'));
    s = winGames(s, 'B', 2);
    s = winGames(s, 'A', 6);
    expect(s.completedSets).toHaveLength(1);
    expect(isChangeOfEndsDue(s)).toBe(false);
  });

  it('fires every six points of a tiebreak', () => {
    // Alternating winners walk the set up to 6-6 without ever deciding it.
    let s = createInitialState(config('bo3'));
    s = playGames(s, ALTERNATING);
    expect(s.games).toEqual({ A: 6, B: 6 });
    expect(s.tiebreak).not.toBeNull();

    const due: number[] = [];
    for (let i = 1; i <= 10; i++) {
      s = awardPoint(s, i % 2 === 0 ? 'A' : 'B');
      if (isChangeOfEndsDue(s)) due.push(i);
    }
    expect(due).toEqual([6]);
  });

  it('has no ends in the set-less quick formats', () => {
    let s = createInitialState(config('points'));
    s = winGames(s, 'A', 1);
    expect(isChangeOfEndsDue(s)).toBe(false);
  });
});

describe('changeOfEndsKey', () => {
  it('changes once the situation moves on, so a prompt is not re-shown', () => {
    let s = createInitialState(config('bo3'));
    s = winGames(s, 'A', 1);
    const first = changeOfEndsKey(s);
    s = winGames(s, 'B', 1);
    expect(changeOfEndsKey(s)).not.toBe(first);
  });
});

describe('canChooseFirstServer', () => {
  it('is open until the first point is played', () => {
    const s = createInitialState(config('bo3'));
    expect(canChooseFirstServer(s)).toBe(true);
    expect(canChooseFirstServer(awardPoint(s, 'A'))).toBe(false);
  });

  it('is closed once the match is decided', () => {
    let s = createInitialState(config('points'));
    s = winGames(s, 'A', 2);
    expect(s.winner).toBe('A');
    expect(canChooseFirstServer(s)).toBe(false);
  });
});
