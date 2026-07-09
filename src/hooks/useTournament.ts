import { useCallback, useMemo } from 'react';
import {
  computeStandings,
  createTournament,
  getTournamentWinner,
  isTournamentComplete,
  recordMatchResult,
} from '../lib/tournament';
import type { MatchSettings } from '../types/match';
import type {
  TeamStanding,
  TournamentFormat,
  TournamentMatch,
  TournamentMatchResult,
  TournamentState,
  TournamentTeam,
} from '../types/tournament';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'padel-score:tournament';

/** Public API returned by {@link useTournament}. */
export interface UseTournament {
  /** Current tournament, or null when none has been created. */
  tournament: TournamentState | null;
  /** Live standings table (empty when no tournament exists). */
  standings: TeamStanding[];
  /** True once every match has a recorded result. */
  isComplete: boolean;
  /** Winning standings row once complete, otherwise null. */
  winner: TeamStanding | null;
  /** Creates a new tournament from pre-formed teams, settings and format. */
  create: (
    teams: TournamentTeam[],
    settings: MatchSettings,
    format: TournamentFormat,
  ) => void;
  /** Marks a match as the one currently being played. */
  startMatch: (matchId: string) => void;
  /** Records a played match's result and returns to the overview. */
  recordResult: (matchId: string, result: TournamentMatchResult) => void;
  /** Clears the "current match" flag without recording a result. */
  clearCurrentMatch: () => void;
  /** Looks up a scheduled match by id. */
  getMatch: (matchId: string) => TournamentMatch | undefined;
  /** Looks up a team by id. */
  getTeam: (teamId: string) => TournamentTeam | undefined;
  /** Deletes the tournament entirely. */
  reset: () => void;
}

/**
 * Owns the tournament lifecycle: creation, the currently-active fixture,
 * result recording and localStorage persistence. All scheduling and standings
 * maths live in the pure {@link ../lib/tournament} engine; this hook only
 * orchestrates state transitions.
 */
export function useTournament(): UseTournament {
  const [tournament, setTournament, remove] =
    useLocalStorage<TournamentState | null>(STORAGE_KEY, null);

  const create = useCallback(
    (
      teams: TournamentTeam[],
      settings: MatchSettings,
      format: TournamentFormat,
    ) => {
      setTournament(createTournament(teams, settings, format));
    },
    [setTournament],
  );

  const startMatch = useCallback(
    (matchId: string) => {
      setTournament((prev) =>
        prev ? { ...prev, currentMatchId: matchId } : prev,
      );
    },
    [setTournament],
  );

  const recordResult = useCallback(
    (matchId: string, result: TournamentMatchResult) => {
      setTournament((prev) =>
        prev ? recordMatchResult(prev, matchId, result) : prev,
      );
    },
    [setTournament],
  );

  const clearCurrentMatch = useCallback(() => {
    setTournament((prev) =>
      prev ? { ...prev, currentMatchId: null } : prev,
    );
  }, [setTournament]);

  const getMatch = useCallback(
    (matchId: string) => tournament?.matches.find((m) => m.id === matchId),
    [tournament],
  );

  const getTeam = useCallback(
    (teamId: string) => tournament?.teams.find((t) => t.id === teamId),
    [tournament],
  );

  const reset = useCallback(() => remove(), [remove]);

  const standings = useMemo(
    () => (tournament ? computeStandings(tournament) : []),
    [tournament],
  );
  const isComplete = useMemo(
    () => (tournament ? isTournamentComplete(tournament) : false),
    [tournament],
  );
  const winner = useMemo(
    () => (tournament ? getTournamentWinner(tournament) : null),
    [tournament],
  );

  return useMemo(
    () => ({
      tournament,
      standings,
      isComplete,
      winner,
      create,
      startMatch,
      recordResult,
      clearCurrentMatch,
      getMatch,
      getTeam,
      reset,
    }),
    [
      tournament,
      standings,
      isComplete,
      winner,
      create,
      startMatch,
      recordResult,
      clearCurrentMatch,
      getMatch,
      getTeam,
      reset,
    ],
  );
}
