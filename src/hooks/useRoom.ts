/**
 * `useRoom` — client-side controller for a shared multiplayer game.
 *
 * Wraps the Socket.IO connection and exposes an API shaped like the offline
 * hooks (`useMatch` / `useTournament`) so the same screens can render either
 * local or online play. The server is authoritative: every method here simply
 * *sends an action*; the resulting {@link RoomState} arrives via a broadcast
 * and is stored in React state for rendering.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSocket } from '../lib/socket';
import {
  computeStandings,
  getTournamentWinner,
  isTournamentComplete,
} from '../lib/tournament';
import type { MatchConfig, MatchSettings, TeamId } from '../types/match';
import type {
  CreateRoomAck,
  JoinRoomAck,
  RoomAction,
  RoomMessage,
  RoomState,
} from '../types/room';
import { RoomEvents } from '../types/room';
import type { TournamentFormat, TournamentTeam } from '../types/tournament';

/** Connection lifecycle of the room controller. */
export type RoomStatus = 'offline' | 'connecting' | 'online';

/** Public API returned by {@link useRoom}. */
export interface UseRoom {
  /** Whether the user is currently in a shared room. */
  online: boolean;
  status: RoomStatus;
  /** The active room code, or null when offline. */
  code: string | null;
  /** Last connection/join error, or null. */
  error: string | null;
  /** The synced room state, or null before the first broadcast. */
  state: RoomState | null;
  /** Latest admin popup message for this room, or null when none/dismissed. */
  message: RoomMessage | null;
  /** Dismisses the current admin popup message. */
  dismissMessage: () => void;
  /** Creates a new room and joins it. */
  createRoom: () => void;
  /** Joins an existing room by code. */
  joinRoom: (code: string) => void;
  /** Leaves the current room and returns to offline play. */
  leaveRoom: () => void;

  // Adapters mirroring the offline hooks so App can render them uniformly.
  mode: RoomState['mode'];
  setMode: (mode: RoomState['mode']) => void;
  match: {
    state: RoomState['match']['present'];
    canUndo: boolean;
    startMatch: (config: MatchConfig) => void;
    awardPointTo: (team: TeamId) => void;
    undo: () => void;
    resetMatch: () => void;
    newMatch: () => void;
    setFirstServer: (team: TeamId) => void;
  };
  tournament: {
    tournament: RoomState['tournament'];
    standings: ReturnType<typeof computeStandings>;
    isComplete: boolean;
    winner: ReturnType<typeof getTournamentWinner>;
    create: (
      teams: TournamentTeam[],
      settings: MatchSettings,
      format: TournamentFormat,
    ) => void;
  };
  // Composite tournament flows (atomic on the server).
  playTournamentMatch: (matchId: string) => void;
  saveTournamentResult: () => void;
  exitTournamentMatch: () => void;
  startNewTournament: () => void;
}

export function useRoom(): UseRoom {
  const [status, setStatus] = useState<RoomStatus>('offline');
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [message, setMessage] = useState<RoomMessage | null>(null);

  // Subscribe to broadcast state updates for the whole lifetime of the page.
  useEffect(() => {
    const socket = getSocket();
    const onState = (next: RoomState) => setState(next);
    const onMessage = (msg: RoomMessage) => setMessage(msg);
    socket.on(RoomEvents.state, onState);
    socket.on(RoomEvents.message, onMessage);
    return () => {
      socket.off(RoomEvents.state, onState);
      socket.off(RoomEvents.message, onMessage);
    };
  }, []);

  const dismissMessage = useCallback(() => setMessage(null), []);

  const createRoom = useCallback(() => {
    setError(null);
    setStatus('connecting');
    getSocket().emit(RoomEvents.create, (res: CreateRoomAck) => {
      setCode(res.code);
      setState(res.state);
      setStatus('online');
    });
  }, []);

  const joinRoom = useCallback((raw: string) => {
    const clean = raw.trim().toUpperCase();
    if (!clean) {
      setError('Please enter a room code.');
      return;
    }
    setError(null);
    setStatus('connecting');
    getSocket().emit(RoomEvents.join, clean, (res: JoinRoomAck) => {
      if (res.ok && res.state) {
        setCode(clean);
        setState(res.state);
        setStatus('online');
      } else {
        setStatus('offline');
        setError(res.error ?? 'Could not join the room.');
      }
    });
  }, []);

  const leaveRoom = useCallback(() => {
    getSocket().emit(RoomEvents.leave);
    setCode(null);
    setState(null);
    setError(null);
    setMessage(null);
    setStatus('offline');
  }, []);

  /** Sends an action to the server (fire-and-forget; state arrives via broadcast). */
  const dispatch = useCallback((action: RoomAction) => {
    getSocket().emit(RoomEvents.action, action);
  }, []);

  const mode = state?.mode ?? 'home';
  const setMode = useCallback(
    (m: RoomState['mode']) => dispatch({ type: 'mode/set', mode: m }),
    [dispatch],
  );

  const match = useMemo(
    () => ({
      state: state?.match.present ?? null,
      canUndo: (state?.match.history.length ?? 0) > 0,
      startMatch: (config: MatchConfig) =>
        dispatch({ type: 'match/start', config }),
      awardPointTo: (team: TeamId) => dispatch({ type: 'match/point', team }),
      undo: () => dispatch({ type: 'match/undo' }),
      resetMatch: () => dispatch({ type: 'match/reset' }),
      newMatch: () => dispatch({ type: 'match/new' }),
      setFirstServer: (team: TeamId) =>
        dispatch({ type: 'match/firstServer', team }),
    }),
    [state, dispatch],
  );

  const tournamentState = state?.tournament ?? null;
  const tournament = useMemo(
    () => ({
      tournament: tournamentState,
      standings: tournamentState ? computeStandings(tournamentState) : [],
      isComplete: tournamentState
        ? isTournamentComplete(tournamentState)
        : false,
      winner: tournamentState ? getTournamentWinner(tournamentState) : null,
      create: (
        teams: TournamentTeam[],
        settings: MatchSettings,
        format: TournamentFormat,
      ) => dispatch({ type: 'tournament/create', teams, settings, format }),
    }),
    [tournamentState, dispatch],
  );

  const playTournamentMatch = useCallback(
    (matchId: string) => dispatch({ type: 'tournament/playMatch', matchId }),
    [dispatch],
  );
  const saveTournamentResult = useCallback(
    () => dispatch({ type: 'tournament/saveResult' }),
    [dispatch],
  );
  const exitTournamentMatch = useCallback(
    () => dispatch({ type: 'tournament/exitMatch' }),
    [dispatch],
  );
  const startNewTournament = useCallback(
    () => dispatch({ type: 'tournament/reset' }),
    [dispatch],
  );

  return {
    online: status === 'online',
    status,
    code,
    error,
    state,
    message,
    dismissMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    mode,
    setMode,
    match,
    tournament,
    playTournamentMatch,
    saveTournamentResult,
    exitTournamentMatch,
    startNewTournament,
  };
}
