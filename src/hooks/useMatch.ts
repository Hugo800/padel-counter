import { useCallback, useMemo } from 'react';
import { awardPoint, canChooseFirstServer, createInitialState } from '../lib/scoring';
import type { MatchConfig, MatchState, TeamId } from '../types/match';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'padel-score:match';
/** Cap the undo history so storage never grows without bound. */
const MAX_HISTORY = 200;

/**
 * The persisted match shape: the current state plus an undo stack of
 * previous snapshots. `null` state means no match has been set up yet.
 */
interface PersistedMatch {
  present: MatchState | null;
  history: MatchState[];
}

const EMPTY: PersistedMatch = { present: null, history: [] };

/** Public API returned by {@link useMatch}. */
export interface UseMatch {
  /** Current match state, or null while on the setup screen. */
  state: MatchState | null;
  /** Whether an undo is currently possible. */
  canUndo: boolean;
  /** Creates a new match from a configuration. */
  startMatch: (config: MatchConfig) => void;
  /** Awards a point to the given team. */
  awardPointTo: (team: TeamId) => void;
  /** Reverts the last state-changing action. */
  undo: () => void;
  /** Resets scores to 0 while keeping the same teams and settings. */
  resetMatch: () => void;
  /** Clears the match entirely and returns to the setup screen. */
  newMatch: () => void;
  /** Sets the first server before any point has been played. */
  setFirstServer: (team: TeamId) => void;
}

/**
 * Central match hook: owns the scoreboard state, an undo history and the
 * localStorage persistence. All scoring rules live in the pure engine;
 * this hook only orchestrates snapshots and side effects.
 */
export function useMatch(): UseMatch {
  const [data, setData] = useLocalStorage<PersistedMatch>(STORAGE_KEY, EMPTY);

  const state = data.present;
  const canUndo = data.history.length > 0;

  const startMatch = useCallback(
    (config: MatchConfig) => {
      setData({ present: createInitialState(config), history: [] });
    },
    [setData],
  );

  const awardPointTo = useCallback(
    (team: TeamId) => {
      setData((prev) => {
        if (!prev.present || prev.present.winner) return prev;
        const next = awardPoint(prev.present, team);
        // No-op if the engine returned the same reference (nothing changed).
        if (next === prev.present) return prev;
        const history = [...prev.history, prev.present].slice(-MAX_HISTORY);
        return { present: next, history };
      });
    },
    [setData],
  );

  const undo = useCallback(() => {
    setData((prev) => {
      if (prev.history.length === 0) return prev;
      const history = prev.history.slice();
      const previous = history.pop()!;
      return { present: previous, history };
    });
  }, [setData]);

  const resetMatch = useCallback(() => {
    setData((prev) => {
      if (!prev.present) return prev;
      const fresh = createInitialState(prev.present.config);
      const history = [...prev.history, prev.present].slice(-MAX_HISTORY);
      return { present: fresh, history };
    });
  }, [setData]);

  const newMatch = useCallback(() => {
    setData(EMPTY);
  }, [setData]);

  const setFirstServer = useCallback(
    (team: TeamId) => {
      // Only allowed before the first point of the match has been played.
      setData((prev) => {
        if (!prev.present) return prev;
        const s = prev.present;
        if (!canChooseFirstServer(s)) return prev;
        return {
          ...prev,
          present: {
            ...s,
            server: team,
            config: { ...s.config, firstServer: team },
          },
        };
      });
    },
    [setData],
  );

  return useMemo(
    () => ({
      state,
      canUndo,
      startMatch,
      awardPointTo,
      undo,
      resetMatch,
      newMatch,
      setFirstServer,
    }),
    [
      state,
      canUndo,
      startMatch,
      awardPointTo,
      undo,
      resetMatch,
      newMatch,
      setFirstServer,
    ],
  );
}
