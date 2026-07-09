/**
 * Pure tournament engine.
 *
 * Like the scoring engine, this module has no UI or side effects: it turns a
 * list of players into random teams, builds a round-robin schedule, folds
 * match results into standings and detects the champion. Every function is
 * deterministic given its inputs (a random-number generator can be injected
 * for reproducible tests).
 */

import type { MatchConfig, MatchSettings, MatchState, TeamId } from '../types/match';
import type {
  TeamStanding,
  TournamentFormat,
  TournamentMatch,
  TournamentMatchResult,
  TournamentPlayer,
  TournamentState,
  TournamentTeam,
} from '../types/tournament';

/** Ranking points awarded for a win. */
export const POINTS_PER_WIN = 2;

/** A bracket tournament needs exactly this many teams (2 opening matches). */
export const BRACKET_TEAM_COUNT = 4;

/** A pluggable random source returning a float in `[0, 1)`. */
export type Rng = () => number;

/** Generates a reasonably-unique id, falling back when crypto is unavailable. */
export function uid(prefix = 'id'): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    // ignore and fall through to the Math.random fallback
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns a shuffled copy of `items` using the Fisher–Yates algorithm.
 * The input array is not mutated.
 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Wraps a list of raw names into {@link TournamentPlayer} objects. */
export function buildPlayers(names: readonly string[]): TournamentPlayer[] {
  return names.map((name, i) => ({
    id: uid('p'),
    name: name.trim() || `Player ${i + 1}`,
  }));
}

/** Default team name derived from its two players. */
function defaultTeamName(players: TournamentPlayer[]): string {
  return players.map((p) => p.name).join(' & ');
}

/**
 * Randomly pairs players into teams of two. Players are shuffled first, then
 * grouped two-by-two. If the count is odd the final player forms a solo team
 * (the UI enforces an even count, so this is only a safety net).
 */
export function createTeams(
  players: readonly TournamentPlayer[],
  rng: Rng = Math.random,
): TournamentTeam[] {
  const shuffled = shuffle(players, rng);
  const teams: TournamentTeam[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const pair = shuffled.slice(i, i + 2);
    teams.push({
      id: uid('t'),
      name: defaultTeamName(pair),
      players: pair,
    });
  }
  return teams;
}

/**
 * Builds a single round-robin schedule (everyone plays everyone once) using
 * the circle method, which spreads fixtures evenly across rounds. A virtual
 * "bye" is inserted for an odd number of teams.
 */
export function generateRoundRobin(
  teams: readonly TournamentTeam[],
): TournamentMatch[] {
  const ids = teams.map((t) => t.id);
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) ids.push('__BYE__');

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arrangement = ids.slice();
  const matches: TournamentMatch[] = [];

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = arrangement[i];
      const away = arrangement[n - 1 - i];
      if (home !== '__BYE__' && away !== '__BYE__') {
        matches.push({
          id: uid('m'),
          round: round + 1,
          teamAId: home,
          teamBId: away,
          result: null,
        });
      }
    }
    // Rotate all but the first element clockwise for the next round.
    const fixed = arrangement[0];
    const rest = arrangement.slice(1);
    rest.unshift(rest.pop() as string);
    arrangement.splice(0, arrangement.length, fixed, ...rest);
  }

  return matches;
}

/**
 * Builds a 4-team knockout bracket:
 * - Round 1: two opening matches with the teams in their given (already
 *   shuffled) order — team 1 vs 2 and team 3 vs 4.
 * - Round 2: the "Final" (winner of match 1 vs winner of match 2) and the
 *   "3rd place" match (loser vs loser). Their teams are filled in
 *   automatically once the opening matches are decided.
 *
 * Requires exactly {@link BRACKET_TEAM_COUNT} teams.
 */
export function generateBracket(
  teams: readonly TournamentTeam[],
): TournamentMatch[] {
  if (teams.length !== BRACKET_TEAM_COUNT) {
    throw new Error(
      `A bracket needs exactly ${BRACKET_TEAM_COUNT} teams, got ${teams.length}.`,
    );
  }

  // Two opening fixtures with concrete teams.
  const semi1: TournamentMatch = {
    id: uid('m'),
    round: 1,
    teamAId: teams[0].id,
    teamBId: teams[1].id,
    label: 'Match 1',
    result: null,
  };
  const semi2: TournamentMatch = {
    id: uid('m'),
    round: 1,
    teamAId: teams[2].id,
    teamBId: teams[3].id,
    label: 'Match 2',
    result: null,
  };

  // Final: winner vs winner. Teams stay null until both openers are played.
  const final: TournamentMatch = {
    id: uid('m'),
    round: 2,
    teamAId: null,
    teamBId: null,
    teamASource: { matchId: semi1.id, outcome: 'winner' },
    teamBSource: { matchId: semi2.id, outcome: 'winner' },
    label: 'Final',
    result: null,
  };

  // Consolation: loser vs loser.
  const consolation: TournamentMatch = {
    id: uid('m'),
    round: 2,
    teamAId: null,
    teamBId: null,
    teamASource: { matchId: semi1.id, outcome: 'loser' },
    teamBSource: { matchId: semi2.id, outcome: 'loser' },
    label: '3rd place',
    result: null,
  };

  return [semi1, semi2, final, consolation];
}

/** Assembles a fresh tournament from pre-formed teams and settings. */
export function createTournament(
  teams: TournamentTeam[],
  settings: MatchSettings,
  format: TournamentFormat = 'round-robin',
): TournamentState {
  return {
    id: uid('tour'),
    teams,
    format,
    matches:
      format === 'bracket'
        ? generateBracket(teams)
        : generateRoundRobin(teams),
    settings,
    currentMatchId: null,
    createdAt: Date.now(),
  };
}

/**
 * Returns a new tournament state with the given match's result recorded and
 * the "current match" cleared. For bracket tournaments, any later fixtures
 * that depend on this match's winner or loser are filled in automatically.
 */
export function recordMatchResult(
  state: TournamentState,
  matchId: string,
  result: TournamentMatchResult,
): TournamentState {
  // First, record the result on the target match.
  const withResult = state.matches.map((m) =>
    m.id === matchId ? { ...m, result } : m,
  );

  // Then propagate the winner/loser into any dependent bracket slots.
  const target = withResult.find((m) => m.id === matchId);
  const resolved = target
    ? propagateBracketSlots(withResult, target)
    : withResult;

  return {
    ...state,
    currentMatchId: null,
    matches: resolved,
  };
}

/**
 * Fills in the team slots of any matches that depend on `source`'s outcome.
 * A no-op for round-robin fixtures (which carry no slot sources).
 */
function propagateBracketSlots(
  matches: TournamentMatch[],
  source: TournamentMatch,
): TournamentMatch[] {
  if (!source.result) return matches;
  const winnerId = source.result.winner === 'A' ? source.teamAId : source.teamBId;
  const loserId = source.result.winner === 'A' ? source.teamBId : source.teamAId;
  const pick = (outcome: 'winner' | 'loser') =>
    outcome === 'winner' ? winnerId : loserId;

  return matches.map((m) => {
    let teamAId = m.teamAId;
    let teamBId = m.teamBId;
    if (m.teamASource?.matchId === source.id) {
      teamAId = pick(m.teamASource.outcome);
    }
    if (m.teamBSource?.matchId === source.id) {
      teamBId = pick(m.teamBSource.outcome);
    }
    return teamAId === m.teamAId && teamBId === m.teamBId
      ? m
      : { ...m, teamAId, teamBId };
  });
}

/** Condenses a finished {@link MatchState} into a tournament result. */
export function resultFromMatchState(
  state: MatchState,
): TournamentMatchResult {
  // In points mode there are no sets: the games won *are* the match score.
  if (state.config.settings.matchType === 'points') {
    return {
      winner: state.winner as TeamId,
      setsA: state.games.A,
      setsB: state.games.B,
      gamesA: state.games.A,
      gamesB: state.games.B,
    };
  }

  const gamesA = state.completedSets.reduce((sum, s) => sum + s.A, 0);
  const gamesB = state.completedSets.reduce((sum, s) => sum + s.B, 0);
  return {
    // A match is only saved once decided, so winner is guaranteed here.
    winner: state.winner as TeamId,
    setsA: state.sets.A,
    setsB: state.sets.B,
    gamesA,
    gamesB,
  };
}

/** Builds a scoring-engine match config for two tournament teams. */
export function buildMatchConfig(
  teamA: TournamentTeam,
  teamB: TournamentTeam,
  settings: MatchSettings,
): MatchConfig {
  const toPlayers = (team: TournamentTeam): [string, string] => [
    team.players[0]?.name ?? '',
    team.players[1]?.name ?? '',
  ];
  return {
    teams: {
      A: { name: teamA.name, players: toPlayers(teamA) },
      B: { name: teamB.name, players: toPlayers(teamB) },
    },
    settings,
    firstServer: 'A',
  };
}

/**
 * Computes the current standings, sorted by points, then set difference,
 * then game difference and finally name.
 */
export function computeStandings(state: TournamentState): TeamStanding[] {
  const table = new Map<string, TeamStanding>();
  for (const team of state.teams) {
    table.set(team.id, {
      teamId: team.id,
      name: team.name,
      played: 0,
      won: 0,
      lost: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
    });
  }

  for (const match of state.matches) {
    if (!match.result) continue;
    if (!match.teamAId || !match.teamBId) continue;
    const a = table.get(match.teamAId);
    const b = table.get(match.teamBId);
    if (!a || !b) continue;

    const { setsA, setsB, gamesA, gamesB, winner } = match.result;
    a.played++;
    b.played++;
    a.setsWon += setsA;
    a.setsLost += setsB;
    b.setsWon += setsB;
    b.setsLost += setsA;
    a.gamesWon += gamesA;
    a.gamesLost += gamesB;
    b.gamesWon += gamesB;
    b.gamesLost += gamesA;

    if (winner === 'A') {
      a.won++;
      b.lost++;
      a.points += POINTS_PER_WIN;
    } else {
      b.won++;
      a.lost++;
      b.points += POINTS_PER_WIN;
    }
  }

  return Array.from(table.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const setDiff = y.setsWon - y.setsLost - (x.setsWon - x.setsLost);
    if (setDiff !== 0) return setDiff;
    const gameDiff = y.gamesWon - y.gamesLost - (x.gamesWon - x.gamesLost);
    if (gameDiff !== 0) return gameDiff;
    return x.name.localeCompare(y.name);
  });
}

/** True once every scheduled match has a recorded result. */
export function isTournamentComplete(state: TournamentState): boolean {
  return state.matches.length > 0 && state.matches.every((m) => m.result);
}

/**
 * The match that decides the champion in a bracket (winner vs winner), or
 * null for other formats / if it can't be found.
 */
export function getBracketFinal(
  state: TournamentState,
): TournamentMatch | null {
  if (state.format !== 'bracket') return null;
  return (
    state.matches.find(
      (m) =>
        m.teamASource?.outcome === 'winner' &&
        m.teamBSource?.outcome === 'winner',
    ) ?? null
  );
}

/**
 * The winning standings row once the tournament is complete, otherwise null.
 *
 * - Bracket: the winner of the final (winner-vs-winner) match.
 * - Round-robin: the top of the table, unless it ends in an exact tie.
 */
export function getTournamentWinner(
  state: TournamentState,
): TeamStanding | null {
  if (!isTournamentComplete(state)) return null;
  const standings = computeStandings(state);
  if (standings.length === 0) return null;

  // In a bracket the champion is whoever wins the final, regardless of the
  // aggregate standings.
  if (state.format === 'bracket') {
    const final = getBracketFinal(state);
    if (!final?.result) return null;
    const championId =
      final.result.winner === 'A' ? final.teamAId : final.teamBId;
    return standings.find((s) => s.teamId === championId) ?? null;
  }

  const [first, second] = standings;
  if (
    second &&
    first.points === second.points &&
    first.setsWon - first.setsLost === second.setsWon - second.setsLost &&
    first.gamesWon - first.gamesLost === second.gamesWon - second.gamesLost
  ) {
    return null; // undecided tie
  }
  return first;
}
