import { describe, expect, it } from 'vitest';
import { initialRoomState, roomReducer } from '../lib/roomReducer';
import type { MatchConfig } from '../types/match';
import type { RoomState } from '../types/room';
import type { TournamentTeam } from '../types/tournament';

/** A quick "points" match config: first to win a single game wins the match. */
const QUICK_MATCH: MatchConfig = {
  teams: {
    A: { name: 'Team A', players: ['a1', 'a2'] },
    B: { name: 'Team B', players: ['b1', 'b2'] },
  },
  settings: {
    format: 3,
    goldenPoint: true,
    tiebreakEnabled: true,
    matchType: 'points',
    pointsToWin: 1,
  },
  firstServer: 'A',
};

function makeTeams(count: number): TournamentTeam[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    players: [
      { id: `p${i}a`, name: `P${i}a` },
      { id: `p${i}b`, name: `P${i}b` },
    ],
  }));
}

/** Awards points to `team` until the live match has a winner. */
function playOutMatch(state: RoomState, team: 'A' | 'B'): RoomState {
  let next = state;
  for (let i = 0; i < 20 && !next.match.present?.winner; i++) {
    next = roomReducer(next, { type: 'match/point', team });
  }
  return next;
}

describe('roomReducer', () => {
  it('starts empty on the home screen', () => {
    const state = initialRoomState();
    expect(state.mode).toBe('home');
    expect(state.match.present).toBeNull();
    expect(state.tournament).toBeNull();
  });

  it('sets the navigation mode', () => {
    const state = roomReducer(initialRoomState(), {
      type: 'mode/set',
      mode: 'doubles',
    });
    expect(state.mode).toBe('doubles');
  });

  it('starts a match and awards points with undo history', () => {
    let state = roomReducer(initialRoomState(), {
      type: 'match/start',
      config: QUICK_MATCH,
    });
    expect(state.match.present).not.toBeNull();
    expect(state.match.history).toHaveLength(0);

    state = roomReducer(state, { type: 'match/point', team: 'A' });
    expect(state.match.present?.points.A).toBe(1);
    expect(state.match.history).toHaveLength(1);

    // Undo reverts to the previous snapshot.
    state = roomReducer(state, { type: 'match/undo' });
    expect(state.match.present?.points.A).toBe(0);
    expect(state.match.history).toHaveLength(0);
  });

  it('ignores points once a winner exists', () => {
    let state = roomReducer(initialRoomState(), {
      type: 'match/start',
      config: QUICK_MATCH,
    });
    state = playOutMatch(state, 'A');
    expect(state.match.present?.winner).toBe('A');

    const before = state.match.present;
    state = roomReducer(state, { type: 'match/point', team: 'B' });
    // No change: same reference returned.
    expect(state.match.present).toBe(before);
  });

  it('resets and clears the match', () => {
    let state = roomReducer(initialRoomState(), {
      type: 'match/start',
      config: QUICK_MATCH,
    });
    state = roomReducer(state, { type: 'match/point', team: 'A' });
    state = roomReducer(state, { type: 'match/reset' });
    expect(state.match.present?.points.A).toBe(0);

    state = roomReducer(state, { type: 'match/new' });
    expect(state.match.present).toBeNull();
    expect(state.match.history).toHaveLength(0);
  });

  it('only changes the first server before the first point', () => {
    let state = roomReducer(initialRoomState(), {
      type: 'match/start',
      config: QUICK_MATCH,
    });
    state = roomReducer(state, { type: 'match/firstServer', team: 'B' });
    expect(state.match.present?.server).toBe('B');

    // After a point, changing the server is ignored.
    state = roomReducer(state, { type: 'match/point', team: 'A' });
    const before = state.match.present;
    state = roomReducer(state, { type: 'match/firstServer', team: 'A' });
    expect(state.match.present).toBe(before);
  });

  it('runs a full tournament fixture end to end', () => {
    // Create a 4-team bracket.
    let state = roomReducer(initialRoomState(), {
      type: 'tournament/create',
      teams: makeTeams(4),
      settings: QUICK_MATCH.settings,
      format: 'bracket',
    });
    expect(state.tournament).not.toBeNull();

    const firstMatchId = state.tournament!.matches[0].id;

    // Start playing the opening fixture → the scoreboard opens.
    state = roomReducer(state, {
      type: 'tournament/playMatch',
      matchId: firstMatchId,
    });
    expect(state.tournament!.currentMatchId).toBe(firstMatchId);
    expect(state.match.present).not.toBeNull();

    // Decide it and save the result.
    state = playOutMatch(state, 'A');
    state = roomReducer(state, { type: 'tournament/saveResult' });
    expect(state.tournament!.currentMatchId).toBeNull();
    expect(state.match.present).toBeNull();
    const recorded = state.tournament!.matches.find(
      (m) => m.id === firstMatchId,
    );
    expect(recorded?.result?.winner).toBe('A');
  });

  it('exits a fixture without recording a result', () => {
    let state = roomReducer(initialRoomState(), {
      type: 'tournament/create',
      teams: makeTeams(4),
      settings: QUICK_MATCH.settings,
      format: 'bracket',
    });
    const id = state.tournament!.matches[0].id;
    state = roomReducer(state, { type: 'tournament/playMatch', matchId: id });
    state = roomReducer(state, { type: 'tournament/exitMatch' });
    expect(state.tournament!.currentMatchId).toBeNull();
    expect(state.match.present).toBeNull();
    expect(
      state.tournament!.matches.find((m) => m.id === id)?.result,
    ).toBeNull();
  });

  it('resets the tournament', () => {
    let state = roomReducer(initialRoomState(), {
      type: 'tournament/create',
      teams: makeTeams(4),
      settings: QUICK_MATCH.settings,
      format: 'bracket',
    });
    state = roomReducer(state, { type: 'tournament/reset' });
    expect(state.tournament).toBeNull();
  });
});
