/**
 * Padel / tennis scoring engine.
 *
 * This module is pure and framework-agnostic: every function takes a
 * {@link MatchState} and returns a **new** immutable state. There is no
 * mutation of the input and no side effects, which makes the rules easy
 * to unit-test and lets the UI keep a simple undo history of snapshots.
 */

import type {
  CompletedSet,
  MatchConfig,
  MatchSettings,
  MatchState,
  PointLabel,
  TeamId,
  TiebreakState,
} from '../types/match';

/** Returns the opposing team id. */
export function otherTeam(team: TeamId): TeamId {
  return team === 'A' ? 'B' : 'A';
}

/** Number of sets a team must win to win the match, given the format. */
export function setsToWin(format: 3 | 5): number {
  return format === 3 ? 2 : 3;
}

/** True when the match uses the short "points" format (no sets). */
export function isPointsMode(settings: MatchSettings): boolean {
  return settings.matchType === 'points';
}

/** Games needed to win a points-mode match (defaults to 2). */
export function pointsToWin(settings: MatchSettings): number {
  return settings.pointsToWin ?? 2;
}

/**
 * Creates a fresh match state from a configuration.
 * All scores start at zero and the chosen first server is set.
 */
export function createInitialState(config: MatchConfig): MatchState {
  return {
    config,
    points: { A: 0, B: 0 },
    games: { A: 0, B: 0 },
    completedSets: [],
    sets: { A: 0, B: 0 },
    tiebreak: null,
    server: config.firstServer,
    winner: null,
  };
}

/** Maps a raw point value (0-3) to its tennis label. */
const POINT_LABELS: Record<number, string> = {
  0: '0',
  1: '15',
  2: '30',
  3: '40',
};

/**
 * True when the current game is at deuce (both teams effectively on 40
 * with no advantage). Only meaningful in a non-tiebreak game.
 */
export function isDeuce(state: MatchState): boolean {
  if (state.tiebreak || state.winner) return false;
  return state.points.A >= 3 && state.points.A === state.points.B;
}

/**
 * True when `team` currently holds the advantage after deuce.
 * Only meaningful when Golden Point is disabled.
 */
export function hasAdvantage(state: MatchState, team: TeamId): boolean {
  if (state.tiebreak || state.winner) return false;
  const other = otherTeam(team);
  return (
    state.points[team] >= 4 &&
    state.points[team] - state.points[other] === 1
  );
}

/**
 * Human-readable point label for a team ("0", "15", "30", "40", "AD",
 * or the numeric tiebreak count).
 */
export function getPointLabel(state: MatchState, team: TeamId): PointLabel {
  if (state.tiebreak) {
    return String(state.tiebreak[team]);
  }
  if (hasAdvantage(state, team)) return 'AD';
  const value = Math.min(state.points[team], 3);
  return POINT_LABELS[value] ?? '40';
}

/**
 * Computes which team serves the point numbered `pointNumber` (1-indexed)
 * of a tiebreak, following standard tennis rules: the starter serves the
 * first point, then service alternates every two points.
 */
export function tiebreakServer(starter: TeamId, pointNumber: number): TeamId {
  if (pointNumber <= 1) return starter;
  // After the first point, points are grouped in pairs. Even groups keep
  // the "other" team serving, odd groups return to the starter.
  const group = Math.floor((pointNumber - 2) / 2);
  return group % 2 === 0 ? otherTeam(starter) : starter;
}

/**
 * Applies a normal (non-tiebreak) game point and returns the next points
 * plus the winner of the game (if the point ended it).
 */
function applyGamePoint(
  points: Record<TeamId, number>,
  team: TeamId,
  goldenPoint: boolean,
): { points: Record<TeamId, number>; gameWonBy: TeamId | null } {
  const other = otherTeam(team);
  const next = { ...points, [team]: points[team] + 1 };

  if (goldenPoint) {
    // No-Ad: first team to reach 4 points (i.e. score at 40) wins the game,
    // including the decisive golden point at 40-40.
    if (next[team] >= 4) {
      return { points: next, gameWonBy: team };
    }
    return { points: next, gameWonBy: null };
  }

  // Advantage scoring: need at least 4 points and a two-point lead.
  if (next[team] >= 4 && next[team] - next[other] >= 2) {
    return { points: next, gameWonBy: team };
  }

  // Normalise deuce/advantage numbers so they never grow unbounded:
  // whenever both teams are level at 4+ points, snap back to 40-40 (3-3).
  if (next[team] >= 4 && next[other] >= 4 && next[team] === next[other]) {
    return { points: { A: 3, B: 3 }, gameWonBy: null };
  }

  return { points: next, gameWonBy: null };
}

/**
 * Handles winning a game: increments the game counter, then resolves any
 * set/match completion and serve rotation. Returns the next match state.
 */
function winGame(state: MatchState, team: TeamId): MatchState {
  const settings = state.config.settings;
  const games = { ...state.games, [team]: state.games[team] + 1 };
  const other = otherTeam(team);

  // --- Points mode: no sets, first to `pointsToWin` games wins the match ---
  if (settings.matchType === 'points') {
    const target = settings.pointsToWin ?? 2;
    if (games[team] >= target) {
      // The match is decided immediately by the winning "point".
      return {
        ...state,
        points: { A: 0, B: 0 },
        games,
        tiebreak: null,
        winner: team,
      };
    }
    // Otherwise continue: reset points and switch server.
    return {
      ...state,
      points: { A: 0, B: 0 },
      games,
      server: otherTeam(state.server),
    };
  }

  // --- Set completion by games (6+ with a two-game lead) ---
  const setWonByGames =
    games[team] >= 6 && games[team] - games[other] >= 2;

  if (setWonByGames) {
    return completeSet(state, { A: games.A, B: games.B }, team, false);
  }

  // --- Start a tiebreak at 6-6 when enabled ---
  if (settings.tiebreakEnabled && games.A === 6 && games.B === 6) {
    return {
      ...state,
      points: { A: 0, B: 0 },
      games,
      // The team due to serve next starts the tiebreak.
      tiebreak: { A: 0, B: 0, starter: otherTeam(state.server) },
      server: otherTeam(state.server),
    };
  }

  // --- Otherwise continue the set: reset points and switch server ---
  return {
    ...state,
    points: { A: 0, B: 0 },
    games,
    server: otherTeam(state.server),
  };
}

/**
 * Records a completed set, updates the set tally and either declares the
 * match winner or resets the board for the next set.
 */
function completeSet(
  state: MatchState,
  gameScore: { A: number; B: number },
  setWinner: TeamId,
  viaTiebreak: boolean,
): MatchState {
  const completed: CompletedSet = {
    A: gameScore.A,
    B: gameScore.B,
    tiebreak: viaTiebreak,
  };
  const completedSets = [...state.completedSets, completed];
  const sets = { ...state.sets, [setWinner]: state.sets[setWinner] + 1 };
  const needed = setsToWin(state.config.settings.format);

  // Match over?
  if (sets[setWinner] >= needed) {
    return {
      ...state,
      points: { A: 0, B: 0 },
      games: { A: 0, B: 0 },
      completedSets,
      sets,
      tiebreak: null,
      winner: setWinner,
    };
  }

  // Determine who serves the first game of the next set.
  // After a tiebreak, the player/team that received first in the tiebreak
  // (i.e. NOT the starter) serves the opening game of the next set.
  // After a normal set the service rotation simply continues.
  const nextServer = viaTiebreak
    ? otherTeam(state.tiebreak?.starter ?? state.server)
    : otherTeam(state.server);

  return {
    ...state,
    points: { A: 0, B: 0 },
    games: { A: 0, B: 0 },
    completedSets,
    sets,
    tiebreak: null,
    server: nextServer,
  };
}

/**
 * Applies a tiebreak point and resolves set/match completion.
 * First team to 7 points with a two-point lead wins the tiebreak (and set).
 */
function applyTiebreakPoint(state: MatchState, team: TeamId): MatchState {
  const tb = state.tiebreak as TiebreakState;
  const other = otherTeam(team);
  const nextTb: TiebreakState = { ...tb, [team]: tb[team] + 1 };

  const won = nextTb[team] >= 7 && nextTb[team] - nextTb[other] >= 2;

  if (won) {
    // The tiebreak counts as a 7-6 game score for the set.
    const games = { ...state.games, [team]: state.games[team] + 1 };
    // Temporarily attach the finished tiebreak so completeSet can read the
    // starter for correct next-set serving.
    return completeSet(
      { ...state, tiebreak: nextTb },
      { A: games.A, B: games.B },
      team,
      true,
    );
  }

  // Tiebreak continues: recompute the server per standard tiebreak rotation.
  const pointsPlayed = nextTb.A + nextTb.B;
  const server = tiebreakServer(tb.starter, pointsPlayed + 1);

  return {
    ...state,
    tiebreak: nextTb,
    server,
  };
}

/**
 * True while the first server may still be corrected: nothing has been played
 * yet. Shared by the UI, the local hook and the room reducer so the rule
 * cannot drift between offline and online play.
 */
export function canChooseFirstServer(state: MatchState): boolean {
  return (
    !state.winner &&
    state.points.A === 0 &&
    state.points.B === 0 &&
    state.games.A === 0 &&
    state.games.B === 0 &&
    state.completedSets.length === 0
  );
}

/**
 * True when the players are due to change ends *right now*.
 *
 * The rule is the same in tennis and padel: ends change after every odd game
 * of a set (so after games 1, 3, 5, ...), which also covers the end of a set
 * that finished on an odd total, and every six points inside a tiebreak.
 *
 * Only ever true between points, never mid-game, so the prompt cannot appear
 * while a rally is being scored. The quick "points" formats have no ends.
 */
export function isChangeOfEndsDue(state: MatchState): boolean {
  if (state.winner) return false;
  if (isPointsMode(state.config.settings)) return false;

  if (state.tiebreak) {
    const played = state.tiebreak.A + state.tiebreak.B;
    return played > 0 && played % 6 === 0;
  }

  // Between games only.
  if (state.points.A !== 0 || state.points.B !== 0) return false;

  const gamesInSet = state.games.A + state.games.B;
  if (gamesInSet > 0) return gamesInSet % 2 === 1;

  // Games are back to 0-0: either the match has not started (no ends to
  // change) or a set just ended, in which case its total decides.
  const last = state.completedSets[state.completedSets.length - 1];
  return last ? (last.A + last.B) % 2 === 1 : false;
}

/**
 * A stable key for the situation {@link isChangeOfEndsDue} is reporting, so
 * the UI can remember that this particular change of ends was dealt with and
 * stop prompting until the next one comes round.
 */
export function changeOfEndsKey(state: MatchState): string {
  const tb = state.tiebreak ? `${state.tiebreak.A + state.tiebreak.B}` : '-';
  return `${state.completedSets.length}:${state.games.A}-${state.games.B}:${tb}`;
}

/**
 * The single public entry point for scoring: awards one point to `team`
 * and returns the resulting match state. If the match is already over the
 * state is returned unchanged.
 */
export function awardPoint(state: MatchState, team: TeamId): MatchState {
  if (state.winner) return state;

  if (state.tiebreak) {
    return applyTiebreakPoint(state, team);
  }

  const { points, gameWonBy } = applyGamePoint(
    state.points,
    team,
    state.config.settings.goldenPoint,
  );

  if (gameWonBy) {
    return winGame({ ...state, points: { A: 0, B: 0 } }, gameWonBy);
  }

  return { ...state, points };
}
