/**
 * Core domain types for the padel scoring engine.
 *
 * The engine is intentionally UI-agnostic: it only knows about teams,
 * points, games, sets and the rules that connect them. Everything the
 * React layer needs to render is derived from {@link MatchState}.
 */

/** Identifies one of the two teams in a match. */
export type TeamId = 'A' | 'B';

/**
 * A raw point value inside a normal (non-tiebreak) game.
 *
 * The values map to the classic tennis/padel notation:
 * `0 → "0"`, `1 → "15"`, `2 → "30"`, `3 → "40"`.
 * Values of 4+ only appear transiently in deuce logic before the
 * engine normalises them back into deuce/advantage states.
 */
export type PointValue = number;

/** Number of sets required to win, depending on the chosen format. */
export type MatchFormat = 3 | 5;

/** User-configurable rules chosen on the setup screen. */
export interface MatchSettings {
  /** Best of 3 or best of 5 sets. */
  format: MatchFormat;
  /** When enabled, deuce is decided by a single "golden point" (No-Ad). */
  goldenPoint: boolean;
  /** When enabled, a set tied at 6-6 is decided by a tiebreak. */
  tiebreakEnabled: boolean;
  /**
   * Match structure:
   * - `'sets'` (default): classic sets → games → points scoring.
   * - `'points'`: a short match with no sets; the first team to win
   *   {@link pointsToWin} games wins the whole match (great for quick
   *   tournament fixtures).
   *
   * Optional for backward compatibility with matches stored before this
   * setting existed; a missing value is treated as `'sets'`.
   */
  matchType?: 'sets' | 'points';
  /**
   * Games required to win a `'points'`-mode match (default 2, i.e. first to
   * 2 points, max 3 games played). Ignored in `'sets'` mode.
   */
  pointsToWin?: number;
}

/** Details about a single team, captured during setup. */
export interface TeamInfo {
  /** Display name for the team. */
  name: string;
  /** Optional individual player names (padel is played 2 vs 2). */
  players: [string, string];
}

/** Configuration required to create a brand new match. */
export interface MatchConfig {
  teams: Record<TeamId, TeamInfo>;
  settings: MatchSettings;
  /** Team that serves the very first game of the match. */
  firstServer: TeamId;
}

/** The score of a single completed set (games won by each team). */
export interface CompletedSet {
  A: number;
  B: number;
  /** True when the set was decided by a tiebreak. */
  tiebreak: boolean;
}

/** Live tiebreak state, present only while a tiebreak is in progress. */
export interface TiebreakState {
  A: number;
  B: number;
  /** Team that served the first point of the tiebreak (for serve rotation). */
  starter: TeamId;
}

/**
 * The complete, serialisable state of a match at a point in time.
 *
 * A single immutable object represents everything needed to render the
 * scoreboard and to fully restore the match after an undo or a refresh.
 */
export interface MatchState {
  config: MatchConfig;
  /** Current points within the active game (0/15/30/40 domain values). */
  points: Record<TeamId, PointValue>;
  /** Games won by each team in the current (in-progress) set. */
  games: Record<TeamId, number>;
  /** Sets already completed earlier in the match. */
  completedSets: CompletedSet[];
  /** Sets won by each team (derived convenience mirror of completedSets). */
  sets: Record<TeamId, number>;
  /** Present only while a tiebreak is being played. */
  tiebreak: TiebreakState | null;
  /** Team currently serving. */
  server: TeamId;
  /** The match winner, or null while the match is still in progress. */
  winner: TeamId | null;
}

/**
 * A single entry in the undo history: an immutable snapshot of the match
 * state taken before an action was applied.
 */
export type MatchSnapshot = MatchState;

/**
 * Human-readable point label for a team, e.g. "0", "15", "40", "AD".
 * For tiebreaks this is simply the numeric point count.
 */
export type PointLabel = string;
