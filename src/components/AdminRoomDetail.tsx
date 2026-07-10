import {
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  MapPinIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { getPointLabel, isPointsMode } from '../lib/scoring';
import { computeStandings } from '../lib/tournament';
import type { MatchState } from '../types/match';
import type { DeviceInfo, RoomState } from '../types/room';
import type { TournamentState } from '../types/tournament';
import { DeviceMap } from './DeviceMap';
import { SetHistory } from './SetHistory';
import { Button } from './ui/Button';

interface AdminRoomDetailProps {
  code: string;
  token: string;
  onBack: () => void;
}

/** How often the room detail auto-refreshes (ms). */
const REFRESH_INTERVAL_MS = 5000;

/**
 * The drill-down view for a single session/room in the admin panel. Shows the
 * connected devices (list + map), the live game settings (player names, rules),
 * the current score and, for tournaments, the standings and bracket/schedule.
 * An inline composer sends a popup message to everyone in the room.
 */
export function AdminRoomDetail({ code, token, onBack }: AdminRoomDetailProps) {
  const { getRoom, sendMessage } = useAdmin();

  const [state, setState] = useState<RoomState | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getRoom(code, token);
    setLoading(false);
    if (res.ok && res.state) {
      setState(res.state);
      setDevices(res.devices ?? []);
      setError(null);
    } else {
      setError(res.error ?? 'Could not load room.');
    }
  }, [getRoom, code, token]);

  // Initial load + auto-refresh while the detail view is open.
  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const res = await sendMessage(code, body, token);
    setSending(false);
    if (res.ok) {
      setText('');
      setFailed(false);
      setFeedback('Message sent');
    } else {
      setFailed(true);
      setFeedback(res.error ?? 'Could not send.');
    }
    setTimeout(() => setFeedback(null), 3000);
  }, [text, sendMessage, code, token]);

  const match = state?.match.present ?? null;
  const tournament = state?.tournament ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← All sessions
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-mono text-2xl font-bold tracking-widest text-brand-600 dark:text-brand-400">
          {code}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {state?.mode ?? '—'}
        </span>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {/* --- Devices ---------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
          <DevicePhoneMobileIcon className="h-4 w-4" />
          Devices ({devices.length})
        </h2>

        {devices.length > 0 && (
          <div className="flex flex-col gap-2">
            {devices.map((d) => (
              <div
                key={d.id}
                className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <DevicePhoneMobileIcon className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {d.device}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{d.ip}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPinIcon className="h-4 w-4" />
                  {d.location
                    ? [d.location.city, d.location.country]
                        .filter(Boolean)
                        .join(', ') || 'Located'
                    : 'Private / unknown'}
                </div>
              </div>
            ))}
          </div>
        )}

        <DeviceMap devices={devices} />
      </section>

      {/* --- Game state ------------------------------------------------- */}
      {match ? (
        <MatchDetail match={match} />
      ) : tournament ? null : (
        <p className="text-sm text-slate-400">No match in progress.</p>
      )}

      {tournament && <TournamentDetail tournament={tournament} />}

      {/* --- Send message ----------------------------------------------- */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Send a message
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            maxLength={280}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={`Message everyone in ${code}…`}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={sending || !text.trim()}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            Send
          </Button>
        </div>
        {feedback && (
          <p className={`text-xs ${failed ? 'text-rose-500' : 'text-brand-600 dark:text-brand-400'}`}>
            {feedback}
          </p>
        )}
      </section>
    </div>
  );
}

/** Read-only summary of the live single match: teams, rules, score. */
function MatchDetail({ match }: { match: MatchState }) {
  const { config } = match;
  const pointsMode = isPointsMode(config.settings);
  const rules = [
    pointsMode
      ? `First to ${config.settings.pointsToWin ?? 2} points`
      : `Best of ${config.settings.format}`,
    config.settings.goldenPoint ? 'Golden point' : 'Advantage',
    !pointsMode && config.settings.tiebreakEnabled ? 'Tiebreak' : null,
  ].filter(Boolean);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Match
      </h2>
      <div className="card flex flex-col gap-3 p-4">
        {/* Teams + current point */}
        <div className="flex items-stretch justify-between gap-3">
          {(['A', 'B'] as const).map((team) => (
            <div key={team} className="flex-1">
              <p className="font-bold text-slate-900 dark:text-white">
                {config.teams[team].name}
                {match.server === team && (
                  <span className="ml-1 text-xs text-brand-500">• serving</span>
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {config.teams[team].players.filter(Boolean).join(' & ') || '—'}
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums text-brand-600 dark:text-brand-400">
                {getPointLabel(match, team)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {rules.map((r) => (
            <span
              key={r}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              {r}
            </span>
          ))}
          {match.winner && (
            <span className="rounded-full bg-brand-600/15 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
              Winner: {config.teams[match.winner].name}
            </span>
          )}
        </div>
      </div>
      <SetHistory state={match} />
    </section>
  );
}

/** Read-only tournament view: standings table plus the bracket/schedule. */
function TournamentDetail({ tournament }: { tournament: TournamentState }) {
  const standings = computeStandings(tournament);
  const nameOf = (id: string | null): string =>
    id ? tournament.teams.find((t) => t.id === id)?.name ?? '—' : '—';

  // Group fixtures by round for a compact bracket/schedule rendering.
  const rounds = [...new Set(tournament.matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Tournament · {tournament.format ?? 'round-robin'}
      </h2>

      {/* Standings */}
      <div className="card overflow-x-auto p-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400">
              <th className="py-1">Team</th>
              <th className="py-1 text-center">P</th>
              <th className="py-1 text-center">W</th>
              <th className="py-1 text-center">Sets</th>
              <th className="py-1 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.teamId} className="text-slate-800 dark:text-slate-100">
                <td className="py-1 font-semibold">{row.name}</td>
                <td className="py-1 text-center tabular-nums">{row.played}</td>
                <td className="py-1 text-center tabular-nums">{row.won}</td>
                <td className="py-1 text-center tabular-nums">
                  {row.setsWon}-{row.setsLost}
                </td>
                <td className="py-1 text-center font-bold tabular-nums">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bracket / schedule */}
      <div className="flex flex-col gap-2">
        {rounds.map((round) => (
          <div key={round} className="card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Round {round}
            </p>
            <div className="flex flex-col gap-1.5">
              {tournament.matches
                .filter((m) => m.round === round)
                .map((m) => {
                  const decided = m.result !== null;
                  const winnerId =
                    m.result?.winner === 'A'
                      ? m.teamAId
                      : m.result?.winner === 'B'
                        ? m.teamBId
                        : null;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-slate-700 dark:text-slate-200">
                        {m.label ? `${m.label}: ` : ''}
                        <span
                          className={
                            winnerId === m.teamAId && decided
                              ? 'font-bold text-brand-600 dark:text-brand-400'
                              : ''
                          }
                        >
                          {nameOf(m.teamAId)}
                        </span>{' '}
                        vs{' '}
                        <span
                          className={
                            winnerId === m.teamBId && decided
                              ? 'font-bold text-brand-600 dark:text-brand-400'
                              : ''
                          }
                        >
                          {nameOf(m.teamBId)}
                        </span>
                      </span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {decided
                          ? `${m.result!.setsA}-${m.result!.setsB}`
                          : m.id === tournament.currentMatchId
                            ? 'live'
                            : '—'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
