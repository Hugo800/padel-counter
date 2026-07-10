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
  /** server → client(s) in a room: an admin broadcast to show as a popup. */
  message: 'room:message',
  /** admin → server: list all active rooms (ack returns summaries). */
  adminList: 'admin:list',
  /** admin → server: fetch full detail (state + devices) for one room. */
  adminRoom: 'admin:room',
  /** admin → server: send a popup message to one room (ack: ok/error). */
  adminMessage: 'admin:message',
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

/**
 * A lightweight overview of one active room, shown in the admin panel. It
 * deliberately avoids the full (potentially large) {@link RoomState} and only
 * carries what the admin list needs to render.
 */
export interface RoomSummary {
  code: string;
  mode: AppMode;
  /** Epoch ms of the last mutation (drives the "last active" column). */
  updatedAt: number;
  /** Number of clients currently connected to the room. */
  clients: number;
  /** Team names of the live match, or null when no match is running. */
  matchTeams: [string, string] | null;
  /** Set scoreline of the live match (e.g. "1-0"), or null. */
  matchScore: string | null;
  /** Whether a tournament is active in the room. */
  hasTournament: boolean;
  /** Number of tournament players, or 0 when there is no tournament. */
  tournamentPlayers: number;
}

/** Ack payload returned to the admin panel when listing rooms. */
export interface AdminListAck {
  ok: boolean;
  /** Present only when `ok` is false (e.g. bad/missing admin token). */
  error?: string;
  /** Present only when `ok` is true. */
  rooms?: RoomSummary[];
}

/** Payload the admin sends to broadcast a popup message to a room. */
export interface AdminMessagePayload {
  /** Target room code. */
  code: string;
  /** Message body shown to everyone in the room. */
  text: string;
  /** Shared admin token, checked against the server's `ADMIN_TOKEN`. */
  token: string;
}

/** Ack payload returned after an admin tries to send a message. */
export interface AdminMessageAck {
  ok: boolean;
  /** Present only when `ok` is false. */
  error?: string;
}

/** A popup message pushed from the admin to everyone in a room. */
export interface RoomMessage {
  text: string;
  /** Epoch ms when the message was sent. */
  at: number;
}

/**
 * Approximate geographic location derived from a device's IP address. All
 * fields are best-effort: IP geolocation is coarse (city level at best) and is
 * unavailable for private/local addresses.
 */
export interface GeoLocation {
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  country: string | null;
}

/**
 * One connected device inside a room, as shown in the admin detail view.
 *
 * "Device name" cannot be read from a browser for privacy reasons, so
 * {@link device} is a best-effort label derived from the User-Agent (e.g.
 * "iPhone · Safari"). The IP is only ever exposed to an authenticated admin.
 */
export interface DeviceInfo {
  /** Opaque per-connection id (the socket id). */
  id: string;
  /** Client IP address (best-effort; may be a proxy/gateway address). */
  ip: string;
  /** Friendly device label parsed from the User-Agent. */
  device: string;
  /** Operating system parsed from the User-Agent, or null. */
  os: string | null;
  /** Browser parsed from the User-Agent, or null. */
  browser: string | null;
  /** Approximate IP-based location, or null when it could not be resolved. */
  location: GeoLocation | null;
  /** Epoch ms when this device connected. */
  connectedAt: number;
}

/** Ack payload returned to the admin panel for a single room's full detail. */
export interface RoomDetailAck {
  ok: boolean;
  /** Present only when `ok` is false. */
  error?: string;
  /** The full room state (match, tournament, mode). */
  state?: RoomState;
  /** The devices currently connected to the room. */
  devices?: DeviceInfo[];
}
