/**
 * Types shared between the browser client and the multiplayer backend.
 *
 * A "room" is a single shared game that several people can score together in
 * real time. The server holds the authoritative {@link RoomState}; clients
 * send {@link RoomAction}s (intent) and receive the full updated state back.
 *
 * These types intentionally depend only on the pure domain types so they can
 * be imported both by the React app (browser) and by the Node server.
 */

import type { MatchConfig, MatchState, MatchSettings, TeamId } from './match';
import type {
  TournamentFormat,
  TournamentState,
  TournamentTeam,
} from './tournament';

/** Top-level navigation mode of a room, shared by everyone in it. */
export type AppMode = 'home' | 'doubles' | 'tournament';

/**
 * The complete, serialisable state of one shared room. Mirrors the local
 * client state so the same components can render it: a navigation mode, the
 * live match (with its undo history) and the optional tournament.
 */
export interface RoomState {
  mode: AppMode;
  /** The live single match plus its undo stack (mirrors `useMatch`). */
  match: { present: MatchState | null; history: MatchState[] };
  /** The active tournament, or null when none exists. */
  tournament: TournamentState | null;
}

/**
 * Every intent a client can send to mutate a room. The server applies these
 * through the shared {@link ../lib/roomReducer} so all clients stay in sync.
 */
export type RoomAction =
  // Navigation -------------------------------------------------------------
  | { type: 'mode/set'; mode: AppMode }
  // Single doubles match ---------------------------------------------------
  | { type: 'match/start'; config: MatchConfig }
  | { type: 'match/point'; team: TeamId }
  | { type: 'match/undo' }
  | { type: 'match/reset' }
  | { type: 'match/new' }
  | { type: 'match/firstServer'; team: TeamId }
  // Tournament -------------------------------------------------------------
  | {
      type: 'tournament/create';
      teams: TournamentTeam[];
      settings: MatchSettings;
      format: TournamentFormat;
    }
  /** Begin playing a scheduled fixture (sets it live and opens the scoreboard). */
  | { type: 'tournament/playMatch'; matchId: string }
  /** Record the current fixture's result from the live match state. */
  | { type: 'tournament/saveResult' }
  /** Leave the current fixture without recording a result. */
  | { type: 'tournament/exitMatch' }
  /** Delete the tournament entirely. */
  | { type: 'tournament/reset' };

/** Socket.IO event names, kept in one place to avoid typos across tiers. */
export const RoomEvents = {
  /** client → server: create a fresh room (ack returns the new code). */
  create: 'room:create',
  /** client → server: join an existing room by code (ack: ok/error). */
  join: 'room:join',
  /** client → server: leave the current room. */
  leave: 'room:leave',
  /** client → server: apply a {@link RoomAction} to the current room. */
  action: 'room:action',
  /** server → client: the full, updated {@link RoomState}. */
  state: 'room:state',
} as const;

/** Ack payload returned when creating a room. */
export interface CreateRoomAck {
  code: string;
  state: RoomState;
}

/** Ack payload returned when joining a room. */
export interface JoinRoomAck {
  ok: boolean;
  /** Present only when `ok` is false. */
  error?: string;
  /** Present only when `ok` is true. */
  state?: RoomState;
}
