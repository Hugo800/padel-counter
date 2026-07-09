import { useMemo } from 'react';
import { PlayIcon, PlusIcon, TrophyIcon } from '@heroicons/react/24/solid';
import type { Theme } from '../hooks/useTheme';
import type {
  TeamStanding,
  TournamentMatch,
  TournamentState,
  TournamentTeam,
} from '../types/tournament';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { TopBar } from './ui/TopBar';

interface TournamentScreenProps {
  tournament: TournamentState;
  standings: TeamStanding[];
  isComplete: boolean;
  winner: TeamStanding | null;
  onPlayMatch: (matchId: string) => void;
  onNewTournament: () => void;
  onHome: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

/**
 * Tournament hub: shows the live standings, the champion once every match is
 * played, and the round-by-round schedule with a button to play each pending
 * fixture. Playing a match hands control to the regular scoreboard.
 */
export function TournamentScreen({
  tournament,
  standings,
  isComplete,
  winner,
  onPlayMatch,
  onNewTournament,
  onHome,
  theme,
  onToggleTheme,
}: TournamentScreenProps) {
  const teamsById = useMemo(() => {
    const map = new Map<string, TournamentTeam>();
    tournament.teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [tournament.teams]);

  // Group fixtures by round for a readable schedule.
  const rounds = useMemo(() => {
    const map = new Map<number, TournamentMatch[]>();
    for (const match of tournament.matches) {
      const list = map.get(match.round) ?? [];
      list.push(match);
      map.set(match.round, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [tournament.matches]);

  const teamName = (id: string | null) =>
    id ? teamsById.get(id)?.name ?? '—' : 'TBD';
  const playedCount = tournament.matches.filter((m) => m.result).length;
  // In points mode a match has no sets, so "sets" and "games" are the same
  // value; collapse them into a single points-difference column.
  const pointsMode = tournament.settings.matchType === 'points';

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-5 px-4 py-4">
      <TopBar
        title="Tournament"
        onBack={onHome}
        theme={theme}
        onToggleTheme={onToggleTheme}
      >
        <Button variant="ghost" size="sm" onClick={onNewTournament}>
          <PlusIcon className="h-5 w-5" />
          New
        </Button>
      </TopBar>

      {/* Champion banner */}
      {isComplete && winner && (
        <div className="card flex animate-slide-up items-center gap-4 border-0 bg-gradient-to-r from-brand-500/25 to-brand-600/10 p-5">
          <TrophyIcon className="h-10 w-10 shrink-0 text-brand-500 dark:text-brand-400" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-300">
              Champion
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {winner.name}
            </p>
          </div>
        </div>
      )}

      {/* Standings */}
      <Card className="overflow-x-auto">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Standings
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {playedCount}/{tournament.matches.length} played
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400">
              <th className="py-1 pr-2 text-left font-semibold">#</th>
              <th className="py-1 pr-2 text-left font-semibold">Team</th>
              <th className="py-1 px-1 text-center font-semibold" title="Played">
                P
              </th>
              <th className="py-1 px-1 text-center font-semibold" title="Won">
                W
              </th>
              {pointsMode ? (
                <th
                  className="py-1 px-1 text-center font-semibold"
                  title="Points difference"
                >
                  Diff
                </th>
              ) : (
                <>
                  <th
                    className="py-1 px-1 text-center font-semibold"
                    title="Set difference"
                  >
                    Sets
                  </th>
                  <th
                    className="py-1 px-1 text-center font-semibold"
                    title="Game difference"
                  >
                    Games
                  </th>
                </>
              )}
              <th className="py-1 pl-1 text-center font-semibold" title="Points">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const setDiff = row.setsWon - row.setsLost;
              const gameDiff = row.gamesWon - row.gamesLost;
              const isLeader = isComplete && winner?.teamId === row.teamId;
              return (
                <tr
                  key={row.teamId}
                  className={`border-t border-slate-100 dark:border-night-700 ${
                    isLeader ? 'text-brand-600 dark:text-brand-400' : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <td className="py-2 pr-2 font-bold tabular-nums">{i + 1}</td>
                  <td className="max-w-[9rem] truncate py-2 pr-2 font-semibold">
                    {row.name}
                  </td>
                  <td className="py-2 px-1 text-center tabular-nums">{row.played}</td>
                  <td className="py-2 px-1 text-center tabular-nums">{row.won}</td>
                  {pointsMode ? (
                    <td className="py-2 px-1 text-center tabular-nums">
                      {formatDiff(setDiff)}
                    </td>
                  ) : (
                    <>
                      <td className="py-2 px-1 text-center tabular-nums">
                        {formatDiff(setDiff)}
                      </td>
                      <td className="py-2 px-1 text-center tabular-nums">
                        {formatDiff(gameDiff)}
                      </td>
                    </>
                  )}
                  <td className="py-2 pl-1 text-center font-bold tabular-nums">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Schedule */}
      <div className="flex flex-col gap-4">
        {rounds.map(([round, matches]) => (
          <Card key={round}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Round {round}
            </h3>
            <ul className="flex flex-col gap-2">
              {matches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  teamName={teamName}
                  onPlay={() => onPlayMatch(match.id)}
                />
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface MatchRowProps {
  match: TournamentMatch;
  teamName: (id: string | null) => string;
  onPlay: () => void;
}

/** A single fixture row: either a result summary or a "play" action. */
function MatchRow({ match, teamName, onPlay }: MatchRowProps) {
  const played = match.result !== null;
  const winnerA = match.result?.winner === 'A';
  const winnerB = match.result?.winner === 'B';
  // A bracket fixture can't be played until both feeder matches are decided.
  const ready = match.teamAId !== null && match.teamBId !== null;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
      <div className="min-w-0 flex-1">
        {match.label && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {match.label}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate ${winnerA ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {teamName(match.teamAId)}
          </span>
          {played && (
            <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-white">
              {match.result!.setsA}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate ${winnerB ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {teamName(match.teamBId)}
          </span>
          {played && (
            <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-white">
              {match.result!.setsB}
            </span>
          )}
        </div>
      </div>

      {played ? (
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Done
        </span>
      ) : ready ? (
        <Button variant="primary" size="sm" onClick={onPlay}>
          <PlayIcon className="h-4 w-4" />
          Play
        </Button>
      ) : (
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          Waiting
        </span>
      )}
    </li>
  );
}

/** Formats a difference with an explicit sign, e.g. +3 / 0 / -2. */
function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}
