/**
 * The authoritative room reducer.
 *
 * This is the single source of truth for how a shared multiplayer room
 * evolves. It is deliberately pure and framework-free so that the Node
 * backend can run it as the authority, while the browser only ever *sends*
 * actions and *renders* the resulting state.
 *
 * It intentionally reuses the exact same pure engines as the offline app
 * (`scoring` and `tournament`), which guarantees online and offline play
 * behave identically.
 *
 * NOTE: Only the server should ever call {@link roomReducer}. Several actions
 * (e.g. creating a tournament) generate random ids and timestamps, so running
 * the reducer on multiple peers would diverge. Clients stay in sync by
 * receiving the full {@link RoomState} the server produces.
 */

import { awardPoint, canChooseFirstServer, createInitialState } from './scoring';
import {
  buildMatchConfig,
  createTournament,
  recordMatchResult,
  resultFromMatchState,
} from './tournament';
import type { RoomAction, RoomState } from '../types/room';

/** Cap the undo history so a long-running room never grows without bound. */
const MAX_HISTORY = 200;

/** The empty match sub-state (no match set up yet). */
const EMPTY_MATCH: RoomState['match'] = { present: null, history: [] };

/** A brand new, empty room sitting on the home screen. */
export function initialRoomState(): RoomState {
  return {
    mode: 'home',
    match: { ...EMPTY_MATCH },
    tournament: null,
    matchStartedAt: null,
    matchEndedAt: null,
  };
}

/**
 * Applies a single {@link RoomAction} to a room, returning the next state.
 * Unknown or currently-invalid actions return the state unchanged so a
 * misbehaving or out-of-date client can never corrupt a room.
 */
export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    // --- Navigation -------------------------------------------------------
    case 'mode/set':
      return { ...state, mode: action.mode };

    // --- Single doubles match --------------------------------------------
    case 'match/start':
      return {
        ...state,
        match: { present: createInitialState(action.config), history: [] },
        matchStartedAt: Date.now(),
        matchEndedAt: null,
      };

    case 'match/point': {
      const { present, history } = state.match;
      // Ignore points once the match is decided or before it exists.
      if (!present || present.winner) return state;
      const next = awardPoint(present, action.team);
      // No-op if the engine reported nothing changed (same reference).
      if (next === present) return state;
      return {
        ...state,
        match: {
          present: next,
          history: [...history, present].slice(-MAX_HISTORY),
        },
        // Freeze the shared clock the moment the match is decided.
        matchEndedAt: next.winner ? Date.now() : state.matchEndedAt,
      };
    }

    case 'match/undo': {
      const { history } = state.match;
      if (history.length === 0) return state;
      const nextHistory = history.slice();
      const previous = nextHistory.pop()!;
      return {
        ...state,
        match: { present: previous, history: nextHistory },
        // Undoing the match point puts the clock back on.
        matchEndedAt: previous.winner ? state.matchEndedAt : null,
      };
    }

    case 'match/reset': {
      const { present, history } = state.match;
      if (!present) return state;
      const fresh = createInitialState(present.config);
      return {
        ...state,
        match: {
          present: fresh,
          history: [...history, present].slice(-MAX_HISTORY),
        },
        matchStartedAt: Date.now(),
        matchEndedAt: null,
      };
    }

    case 'match/new':
      return {
        ...state,
        match: { ...EMPTY_MATCH },
        matchStartedAt: null,
        matchEndedAt: null,
      };

    case 'match/firstServer': {
      const { present } = state.match;
      if (!present) return state;
      // Only allowed before the very first point has been played.
      if (!canChooseFirstServer(present)) return state;
      return {
        ...state,
        match: {
          ...state.match,
          present: {
            ...present,
            server: action.team,
            config: { ...present.config, firstServer: action.team },
          },
        },
      };
    }

    // --- Tournament -------------------------------------------------------
    case 'tournament/create':
      return {
        ...state,
        tournament: createTournament(
          action.teams,
          action.settings,
          action.format,
        ),
        match: { ...EMPTY_MATCH },
        matchStartedAt: null,
        matchEndedAt: null,
      };

    case 'tournament/playMatch': {
      const t = state.tournament;
      if (!t) return state;
      const fixture = t.matches.find((m) => m.id === action.matchId);
      if (!fixture) return state;
      const teamA = t.teams.find((x) => x.id === fixture.teamAId);
      const teamB = t.teams.find((x) => x.id === fixture.teamBId);
      // Bracket slots may still be pending (null team ids) → not playable yet.
      if (!teamA || !teamB) return state;
      return {
        ...state,
        tournament: { ...t, currentMatchId: action.matchId },
        match: {
          present: createInitialState(
            buildMatchConfig(teamA, teamB, t.settings),
          ),
          history: [],
        },
        matchStartedAt: Date.now(),
        matchEndedAt: null,
      };
    }

    case 'tournament/saveResult': {
      const t = state.tournament;
      const present = state.match.present;
      // Only save a decided match tied to a live fixture.
      if (!t || !t.currentMatchId || !present?.winner) return state;
      return {
        ...state,
        tournament: recordMatchResult(
          t,
          t.currentMatchId,
          resultFromMatchState(present),
        ),
        match: { ...EMPTY_MATCH },
        matchStartedAt: null,
        matchEndedAt: null,
      };
    }

    case 'tournament/exitMatch': {
      const t = state.tournament;
      if (!t) {
        return {
          ...state,
          match: { ...EMPTY_MATCH },
          matchStartedAt: null,
          matchEndedAt: null,
        };
      }
      return {
        ...state,
        tournament: { ...t, currentMatchId: null },
        match: { ...EMPTY_MATCH },
        matchStartedAt: null,
        matchEndedAt: null,
      };
    }

    case 'tournament/reset':
      return {
        ...state,
        tournament: null,
        match: { ...EMPTY_MATCH },
        matchStartedAt: null,
        matchEndedAt: null,
      };

    default:
      return state;
  }
}
