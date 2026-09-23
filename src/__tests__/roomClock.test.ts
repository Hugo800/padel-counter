import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialRoomState, roomReducer } from '../lib/roomReducer';
import { settingsFromChoice } from '../lib/format';
import type { MatchConfig } from '../types/match';
import type { RoomState } from '../types/room';

const CONFIG: MatchConfig = {
  teams: {
    A: { name: 'A', players: ['', ''] },
    B: { name: 'B', players: ['', ''] },
  },
  // First to 2 points, so the match can be decided in a few actions.
  settings: settingsFromChoice('points', {
    goldenPoint: true,
    tiebreakEnabled: false,
  }),
  firstServer: 'A',
};

/** Awards `n` points to A, one action at a time. */
function pointsToA(state: RoomState, n: number): RoomState {
  let s = state;
  for (let i = 0; i < n; i++) s = roomReducer(s, { type: 'match/point', team: 'A' });
  return s;
}

describe('shared match clock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts empty', () => {
    const s = initialRoomState();
    expect(s.matchStartedAt).toBeNull();
    expect(s.matchEndedAt).toBeNull();
  });

  it('stamps the start when a match begins', () => {
    vi.setSystemTime(new Date('2026-09-08T10:00:00Z'));
    const s = roomReducer(initialRoomState(), {
      type: 'match/start',
      config: CONFIG,
    });
    expect(s.matchStartedAt).toBe(Date.now());
    expect(s.matchEndedAt).toBeNull();
  });

  it('freezes the clock when the match is decided', () => {
    vi.setSystemTime(new Date('2026-09-08T10:00:00Z'));
    let s = roomReducer(initialRoomState(), { type: 'match/start', config: CONFIG });
    const startedAt = s.matchStartedAt;

    vi.setSystemTime(new Date('2026-09-08T10:42:00Z'));
    s = pointsToA(s, 8); // golden point, first to 2 games
    expect(s.match.present?.winner).toBe('A');
    expect(s.matchStartedAt).toBe(startedAt); // start is not moved
    expect(s.matchEndedAt).toBe(Date.now());
  });

  it('restarts the clock when the score is reset', () => {
    vi.setSystemTime(new Date('2026-09-08T10:00:00Z'));
    let s = roomReducer(initialRoomState(), { type: 'match/start', config: CONFIG });
    vi.setSystemTime(new Date('2026-09-08T11:00:00Z'));
    s = roomReducer(s, { type: 'match/reset' });
    expect(s.matchStartedAt).toBe(Date.now());
    expect(s.matchEndedAt).toBeNull();
  });

  it('puts the clock back on when the match point is undone', () => {
    vi.setSystemTime(new Date('2026-09-08T10:00:00Z'));
    let s = roomReducer(initialRoomState(), { type: 'match/start', config: CONFIG });
    s = pointsToA(s, 8);
    expect(s.matchEndedAt).not.toBeNull();

    s = roomReducer(s, { type: 'match/undo' });
    expect(s.match.present?.winner).toBeNull();
    expect(s.matchEndedAt).toBeNull();
  });

  it('clears the clock when the match is cleared', () => {
    let s = roomReducer(initialRoomState(), { type: 'match/start', config: CONFIG });
    s = roomReducer(s, { type: 'match/new' });
    expect(s.matchStartedAt).toBeNull();
    expect(s.matchEndedAt).toBeNull();
  });
});
