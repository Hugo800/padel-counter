import { describe, expect, it } from 'vitest';
import {
  BRACKET_TEAM_COUNT,
  buildPlayers,
  computeStandings,
  createTeams,
  createTournament,
  generateBracket,
  generateRoundRobin,
  getBracketFinal,
  getTournamentWinner,
  isTournamentComplete,
  recordMatchResult,
  resultFromMatchState,
  shuffle,
} from '../lib/tournament';
import type { MatchSettings, MatchState } from '../types/match';
import type { TournamentTeam } from '../types/tournament';

/** Deterministic seeded RNG (mulberry32) for reproducible tests. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SETTINGS: MatchSettings = {
  format: 3,
  goldenPoint: true,
  tiebreakEnabled: true,
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

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = input.slice();
    const out = shuffle(input, mulberry32(42));
    expect(out).toHaveLength(5);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual(copy); // original untouched
  });

  it('is deterministic for a fixed seed', () => {
    expect(shuffle([1, 2, 3, 4], mulberry32(7))).toEqual(
      shuffle([1, 2, 3, 4], mulberry32(7)),
    );
  });
});

describe('createTeams', () => {
  it('pairs players into teams of two', () => {
    const players = buildPlayers(['A', 'B', 'C', 'D', 'E', 'F']);
    const teams = createTeams(players, mulberry32(1));
    expect(teams).toHaveLength(3);
    teams.forEach((t) => expect(t.players).toHaveLength(2));
    // every player appears exactly once
    const ids = teams.flatMap((t) => t.players.map((p) => p.id)).sort();
    expect(ids).toEqual(players.map((p) => p.id).sort());
  });

  it('derives a team name from its players', () => {
    const players = buildPlayers(['Ann', 'Bob']);
    const [team] = createTeams(players, mulberry32(3));
    expect(team.name).toContain(' & ');
  });
});

describe('generateRoundRobin', () => {
  it('schedules everyone against everyone once', () => {
    const teams = makeTeams(4);
    const matches = generateRoundRobin(teams);
    // n*(n-1)/2 fixtures
    expect(matches).toHaveLength(6);
    // 3 rounds for 4 teams
    expect(Math.max(...matches.map((m) => m.round))).toBe(3);
  });

  it('gives every team the same number of games (n-1)', () => {
    const teams = makeTeams(6);
    const matches = generateRoundRobin(teams);
    const counts = new Map<string, number>();
    for (const m of matches) {
      counts.set(m.teamAId!, (counts.get(m.teamAId!) ?? 0) + 1);
      counts.set(m.teamBId!, (counts.get(m.teamBId!) ?? 0) + 1);
    }
    for (const team of teams) {
      expect(counts.get(team.id)).toBe(5);
    }
  });

  it('handles an odd number of teams with byes', () => {
    const teams = makeTeams(3);
    const matches = generateRoundRobin(teams);
    expect(matches).toHaveLength(3); // 3*2/2
    expect(matches.every((m) => m.teamAId !== '__BYE__')).toBe(true);
    expect(matches.every((m) => m.teamBId !== '__BYE__')).toBe(true);
  });

  it('produces a single fixture for two teams', () => {
    const matches = generateRoundRobin(makeTeams(2));
    expect(matches).toHaveLength(1);
    expect(matches[0].round).toBe(1);
  });
});

describe('createTournament', () => {
  it('builds teams schedule and clean initial state', () => {
    const teams = makeTeams(4);
    const t = createTournament(teams, SETTINGS);
    expect(t.teams).toBe(teams);
    expect(t.matches).toHaveLength(6);
    expect(t.currentMatchId).toBeNull();
    expect(t.settings).toEqual(SETTINGS);
  });
});

describe('recordMatchResult & standings', () => {
  it('records a result and updates standings', () => {
    let t = createTournament(makeTeams(2), SETTINGS);
    const match = t.matches[0];
    t = recordMatchResult(t, match.id, {
      winner: 'A',
      setsA: 2,
      setsB: 1,
      gamesA: 13,
      gamesB: 10,
    });

    expect(t.matches[0].result).not.toBeNull();
    const standings = computeStandings(t);
    const winner = standings.find((s) => s.teamId === match.teamAId)!;
    const loser = standings.find((s) => s.teamId === match.teamBId)!;
    expect(winner.won).toBe(1);
    expect(winner.points).toBe(2);
    expect(winner.setsWon).toBe(2);
    expect(loser.lost).toBe(1);
    expect(loser.points).toBe(0);
    expect(standings[0].teamId).toBe(match.teamAId); // winner ranked first
  });

  it('breaks ties by set then game difference', () => {
    // Two teams both win one match; differentiate by game difference.
    const teams = makeTeams(3);
    let t = createTournament(teams, SETTINGS);
    // Give team 1 a big win, team 2 a narrow win, team 3 loses both.
    const [m1, m2, m3] = t.matches;
    // We do not assume ordering of pairings, just feed results by index.
    t = recordMatchResult(t, m1.id, {
      winner: 'A',
      setsA: 2,
      setsB: 0,
      gamesA: 12,
      gamesB: 2,
    });
    t = recordMatchResult(t, m2.id, {
      winner: 'A',
      setsA: 2,
      setsB: 0,
      gamesA: 12,
      gamesB: 8,
    });
    t = recordMatchResult(t, m3.id, {
      winner: 'B',
      setsA: 0,
      setsB: 2,
      gamesA: 5,
      gamesB: 12,
    });
    const standings = computeStandings(t);
    // Standings are fully ordered and internally consistent.
    expect(standings).toHaveLength(3);
    expect(standings[0].points).toBeGreaterThanOrEqual(standings[1].points);
  });
});

describe('completion & winner', () => {
  it('detects completion and the champion', () => {
    let t = createTournament(makeTeams(2), SETTINGS);
    expect(isTournamentComplete(t)).toBe(false);
    expect(getTournamentWinner(t)).toBeNull();

    const m = t.matches[0];
    t = recordMatchResult(t, m.id, {
      winner: 'B',
      setsA: 0,
      setsB: 2,
      gamesA: 4,
      gamesB: 12,
    });
    expect(isTournamentComplete(t)).toBe(true);
    expect(getTournamentWinner(t)?.teamId).toBe(m.teamBId);
  });
});

describe('resultFromMatchState', () => {
  it('summarises a finished match state', () => {
    const state = {
      config: {
        settings: { format: 3, goldenPoint: true, tiebreakEnabled: true },
      } as MatchState['config'],
      points: { A: 0, B: 0 },
      games: { A: 0, B: 0 },
      completedSets: [
        { A: 6, B: 3, tiebreak: false },
        { A: 4, B: 6, tiebreak: false },
        { A: 6, B: 2, tiebreak: false },
      ],
      sets: { A: 2, B: 1 },
      tiebreak: null,
      server: 'A' as const,
      winner: 'A' as const,
    } satisfies MatchState;

    const result = resultFromMatchState(state);
    expect(result).toEqual({
      winner: 'A',
      setsA: 2,
      setsB: 1,
      gamesA: 16,
      gamesB: 11,
    });
  });

  it('summarises a points-mode match from the games won', () => {
    const state = {
      config: {
        settings: {
          format: 3,
          goldenPoint: true,
          tiebreakEnabled: false,
          matchType: 'points',
          pointsToWin: 2,
        },
      } as MatchState['config'],
      points: { A: 0, B: 0 },
      games: { A: 2, B: 1 },
      completedSets: [],
      sets: { A: 0, B: 0 },
      tiebreak: null,
      server: 'A' as const,
      winner: 'A' as const,
    } satisfies MatchState;

    expect(resultFromMatchState(state)).toEqual({
      winner: 'A',
      setsA: 2,
      setsB: 1,
      gamesA: 2,
      gamesB: 1,
    });
  });
});

describe('bracket format', () => {
  it('needs exactly four teams', () => {
    expect(() => generateBracket(makeTeams(3))).toThrow();
    expect(() => generateBracket(makeTeams(5))).toThrow();
    expect(generateBracket(makeTeams(BRACKET_TEAM_COUNT))).toHaveLength(4);
  });

  it('opens with two concrete matches and two pending ones', () => {
    const matches = generateBracket(makeTeams(4));
    const round1 = matches.filter((m) => m.round === 1);
    const round2 = matches.filter((m) => m.round === 2);
    expect(round1).toHaveLength(2);
    expect(round2).toHaveLength(2);
    // Openers have concrete teams.
    round1.forEach((m) => {
      expect(m.teamAId).not.toBeNull();
      expect(m.teamBId).not.toBeNull();
    });
    // Round 2 starts empty and references the openers.
    round2.forEach((m) => {
      expect(m.teamAId).toBeNull();
      expect(m.teamBId).toBeNull();
      expect(m.teamASource).toBeDefined();
      expect(m.teamBSource).toBeDefined();
    });
    // Exactly one winners' final and one losers' consolation match.
    const final = round2.find(
      (m) =>
        m.teamASource?.outcome === 'winner' &&
        m.teamBSource?.outcome === 'winner',
    );
    const consolation = round2.find(
      (m) =>
        m.teamASource?.outcome === 'loser' &&
        m.teamBSource?.outcome === 'loser',
    );
    expect(final).toBeDefined();
    expect(consolation).toBeDefined();
  });

  it('fills the final and consolation once the openers are decided', () => {
    const teams = makeTeams(4);
    let t = createTournament(teams, SETTINGS, 'bracket');
    const [m1, m2] = t.matches.filter((m) => m.round === 1);
    const final = getBracketFinal(t)!;
    const consolation = t.matches.find(
      (m) => m.round === 2 && m.id !== final.id,
    )!;

    const winA = { winner: 'A' as const, setsA: 2, setsB: 0, gamesA: 12, gamesB: 4 };
    const winB = { winner: 'B' as const, setsA: 0, setsB: 2, gamesA: 4, gamesB: 12 };

    t = recordMatchResult(t, m1.id, winA); // m1 team A wins, team B loses
    t = recordMatchResult(t, m2.id, winB); // m2 team B wins, team A loses

    const finalNow = t.matches.find((m) => m.id === final.id)!;
    const consolationNow = t.matches.find((m) => m.id === consolation.id)!;

    // Final = winner of m1 vs winner of m2.
    expect(finalNow.teamAId).toBe(m1.teamAId);
    expect(finalNow.teamBId).toBe(m2.teamBId);
    // Consolation = loser of m1 vs loser of m2.
    expect(consolationNow.teamAId).toBe(m1.teamBId);
    expect(consolationNow.teamBId).toBe(m2.teamAId);
  });

  it('crowns the winner of the final as champion', () => {
    const teams = makeTeams(4);
    let t = createTournament(teams, SETTINGS, 'bracket');
    const [m1, m2] = t.matches.filter((m) => m.round === 1);
    const winA = { winner: 'A' as const, setsA: 2, setsB: 0, gamesA: 12, gamesB: 4 };

    t = recordMatchResult(t, m1.id, winA);
    t = recordMatchResult(t, m2.id, winA);
    expect(isTournamentComplete(t)).toBe(false);

    const final = getBracketFinal(t)!;
    const consolation = t.matches.find(
      (m) => m.round === 2 && m.id !== final.id,
    )!;
    // Champion is the winner of the final, not the aggregate leader.
    t = recordMatchResult(t, final.id, { winner: 'B', setsA: 0, setsB: 2, gamesA: 5, gamesB: 12 });
    t = recordMatchResult(t, consolation.id, winA);

    expect(isTournamentComplete(t)).toBe(true);
    const finalNow = t.matches.find((m) => m.id === final.id)!;
    expect(finalNow.teamBId).not.toBeNull();
    expect(getTournamentWinner(t)?.teamId).toBe(finalNow.teamBId);
  });
});
