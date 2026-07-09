/**
 * Domain types for the tournament mode.
 *
 * A tournament randomly splits a pool of players into fixed teams of two and
 * generates a round-robin schedule. Each scheduled match is played with the
 * regular scoring engine; its outcome is summarised back into a
 * {@link TournamentMatchResult} and folded into the live standings.
 */

import type { MatchSettings, TeamId } from './match';

/** A single participant entered on the tournament setup screen. */
export interface TournamentPlayer {
  id: string;
  name: string;
}

/** A randomly-formed pair of players that competes as one team. */
export interface TournamentTeam {
  id: string;
  /** Display name, by default derived from the two player names. */
  name: string;
  players: TournamentPlayer[];
}

/** The condensed outcome of a completed tournament match. */
export interface TournamentMatchResult {
  /** Which side of the match won ('A' = teamA, 'B' = teamB). */
  winner: TeamId;
  setsA: number;
  setsB: number;
  gamesA: number;
  gamesB: number;
}

/**
 * How a tournament is scheduled:
 * - `'round-robin'` (default): everyone plays everyone once, ranked by points.
 * - `'bracket'`: a 4-team knockout — the two random opening matches feed a
 *   winners' final (winner vs winner) and a consolation match (loser vs loser).
 */
export type TournamentFormat = 'round-robin' | 'bracket';

/**
 * Points a slot in a bracket match to the winner (or loser) of an earlier
 * fixture, so it can be filled in automatically once that fixture is decided.
 */
export interface MatchSlotSource {
  /** The earlier match this slot depends on. */
  matchId: string;
  /** Whether this slot is filled by that match's winner or loser. */
  outcome: 'winner' | 'loser';
}

/** One fixture in the schedule (round-robin or bracket). */
export interface TournamentMatch {
  id: string;
  /** 1-indexed round number this match belongs to. */
  round: number;
  /** Team on side A, or null while still awaiting a bracket dependency. */
  teamAId: string | null;
  /** Team on side B, or null while still awaiting a bracket dependency. */
  teamBId: string | null;
  /** For bracket matches: where side A's team comes from. */
  teamASource?: MatchSlotSource;
  /** For bracket matches: where side B's team comes from. */
  teamBSource?: MatchSlotSource;
  /** Optional human label for special fixtures, e.g. "Final", "3rd place". */
  label?: string;
  /** Result once played, otherwise null. */
  result: TournamentMatchResult | null;
}

/** The complete, serialisable state of a tournament. */
export interface TournamentState {
  id: string;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  /**
   * Scheduling structure. Optional for backward compatibility with
   * tournaments stored before brackets existed (a missing value = round-robin).
   */
  format?: TournamentFormat;
  /** Scoring rules applied to every match in the tournament. */
  settings: MatchSettings;
  /** Id of the match currently being played, or null on the overview. */
  currentMatchId: string | null;
  createdAt: number;
}

/** A computed standings row for one team. */
export interface TeamStanding {
  teamId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  /** Ranking points (2 per win). */
  points: number;
}
