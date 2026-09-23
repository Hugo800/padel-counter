import {
  ArrowPathIcon,
  ChevronRightIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  SignalIcon,
  TrophyIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import type { Theme } from '../hooks/useTheme';
import type { DeviceInfo, RoomSummary } from '../types/room';
import { AdminRoomDetail } from './AdminRoomDetail';
import { DeviceMap } from './DeviceMap';
import { Button } from './ui/Button';
import { TopBar } from './ui/TopBar';

interface AdminPanelProps {
  theme: Theme;
  onToggleTheme: () => void;
  /** Leaves the admin panel and returns to the normal app. */
  onExit: () => void;
}

/** How often the room list auto-refreshes while the panel is unlocked (ms). */
const REFRESH_INTERVAL_MS = 5000;

/**
 * A hidden operator console (reached via the `#admin` URL hash). It lists every
 * active room/session on the server and lets an operator push a popup message
 * to any room. Access is gated by an admin token that is checked server-side
 * against the `ADMIN_TOKEN` environment variable; the token is kept only in
 * memory for the lifetime of the page.
 */
export function AdminPanel({ theme, onToggleTheme, onExit }: AdminPanelProps) {
  const { listRooms, listDevices, sendMessage } = useAdmin();

  const [token, setToken] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  // Global device log: everyone who has connected to the site (incl. room-less).
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Which room's detail view is open, or null while showing the list.
  const [selected, setSelected] = useState<string | null>(null);

  /** Fetches the current room list + device log; locks on auth failure. */
  const refresh = useCallback(
    async (activeToken: string) => {
      setLoading(true);
      const [roomsRes, devicesRes] = await Promise.all([
        listRooms(activeToken),
        listDevices(activeToken),
      ]);
      setLoading(false);
      if (roomsRes.ok && roomsRes.rooms) {
        setRooms(roomsRes.rooms);
        if (devicesRes.ok && devicesRes.devices) setDevices(devicesRes.devices);
        setError(null);
        return true;
      }
      setError(roomsRes.error ?? 'Could not load rooms.');
      return false;
    },
    [listRooms, listDevices],
  );

  const unlock = useCallback(async () => {
    if (!token.trim()) {
      setError('Please enter the admin token.');
      return;
    }
    const ok = await refresh(token.trim());
    if (ok) setUnlocked(true);
  }, [token, refresh]);

  // Auto-refresh the room list on an interval while unlocked (paused while a
  // single room's detail view is open, which does its own refreshing).
  useEffect(() => {
    if (!unlocked || selected) return;
    const id = setInterval(() => {
      void refresh(token.trim());
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [unlocked, selected, token, refresh]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <TopBar title="Admin" onBack={onExit} theme={theme} onToggleTheme={onToggleTheme} />

      {!unlocked ? (
        // --- Token gate -----------------------------------------------------
        <div className="card mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <LockClosedIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Admin access</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter the admin token to view active sessions and send messages.
          </p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && unlock()}
            placeholder="Admin token"
            autoComplete="off"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <Button variant="primary" onClick={unlock} disabled={loading}>
            {loading ? 'Checking…' : 'Unlock'}
          </Button>
        </div>
      ) : selected ? (
        // --- Single room detail --------------------------------------------
        <AdminRoomDetail
          code={selected}
          token={token.trim()}
          onBack={() => setSelected(null)}
        />
      ) : (
        // --- Room list ------------------------------------------------------
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">
                {rooms.length}
              </span>{' '}
              active {rooms.length === 1 ? 'session' : 'sessions'}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refresh(token.trim())}
              disabled={loading}
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          {rooms.length === 0 ? (
            <div className="card flex items-center justify-center p-10 text-slate-400">
              No active sessions right now.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rooms.map((room) => (
                <RoomRow
                  key={room.code}
                  room={room}
                  onOpen={() => setSelected(room.code)}
                  onSend={(text) => sendMessage(room.code, text, token.trim())}
                />
              ))}
            </div>
          )}

          {/* --- Global device log ---------------------------------------- */}
          <DeviceLog devices={devices} />
        </>
      )}
    </div>
  );
}

interface RoomRowProps {
  room: RoomSummary;
  onOpen: () => void;
  onSend: (text: string) => Promise<{ ok: boolean; error?: string }>;
}

/** One room card with its live summary and an inline "send message" form. */
function RoomRow({ room, onOpen, onSend }: RoomRowProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const res = await onSend(body);
    setSending(false);
    if (res.ok) {
      setText('');
      setFailed(false);
      setFeedback('Message sent');
    } else {
      setFailed(true);
      setFeedback(res.error ?? 'Could not send.');
    }
    // Clear the confirmation after a short while.
    setTimeout(() => setFeedback(null), 3000);
  }, [text, onSend]);

  return (
    <div className="card flex flex-col gap-3 p-4">
      {/* Header doubles as the drill-down trigger into the room detail view. */}
      <button
        type="button"
        onClick={onOpen}
        className="-m-1 flex flex-wrap items-center justify-between gap-2 rounded-xl p-1 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest text-brand-600 dark:text-brand-400">
            {room.code}
          </span>
          <ModeBadge room={room} />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <SignalIcon className="h-4 w-4" />
          {room.clients} {room.clients === 1 ? 'device' : 'devices'}
          <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
          {formatRelative(room.updatedAt)}
          <ChevronRightIcon className="h-4 w-4 text-slate-400" />
        </div>
      </button>

      {/* Live context: match teams/score or tournament size. */}
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {describeRoom(room)}
      </p>

      {/* Inline message composer. */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          maxLength={280}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`Message everyone in ${room.code}…`}
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
    </div>
  );
}

/** A small pill showing the room's current navigation mode. */
function ModeBadge({ room }: { room: RoomSummary }) {
  const label =
    room.mode === 'tournament'
      ? 'Tournament'
      : room.mode === 'doubles'
        ? 'Doubles'
        : room.mode === 'singles'
          ? 'Singles'
          : 'Lobby';
  const Icon =
    room.mode === 'tournament'
      ? TrophyIcon
      : room.mode === 'singles'
        ? UserIcon
        : UserGroupIcon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/** Builds a human-readable one-liner describing what's happening in a room. */
function describeRoom(room: RoomSummary): string {
  if (room.matchTeams) {
    const [a, b] = room.matchTeams;
    return `${a} vs ${b}${room.matchScore ? ` — sets ${room.matchScore}` : ''}`;
  }
  if (room.hasTournament) {
    return `Tournament with ${room.tournamentPlayers} players`;
  }
  return 'Waiting in the lobby (no match yet).';
}

/** Formats an epoch-ms timestamp as a short "x ago" relative string. */
function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  return `${hrs}h ago`;
}

/**
 * The global device log: every device that has connected to the site — online
 * now and recently disconnected — including those that never joined a room
 * ("ohne Raumcode"). Shows each device's best-effort name, IP, approximate
 * location and its current room (or none), plus a map of all located devices.
 */
function DeviceLog({ devices }: { devices: DeviceInfo[] }) {
  const online = devices.filter((d) => d.online).length;
  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
          <ComputerDesktopIcon className="h-4 w-4" />
          Device log ({devices.length})
        </h2>
        <span className="text-xs text-slate-400">
          {online} online · {devices.length - online} offline
        </span>
      </div>

      {devices.length === 0 ? (
        <div className="card flex items-center justify-center p-8 text-sm text-slate-400">
          No devices have connected yet.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {devices.map((d) => (
              <div
                key={d.id}
                className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  {/* Online indicator: pulsing green dot, grey when offline. */}
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      d.online ? 'animate-pulse bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    title={d.online ? 'Online' : 'Offline'}
                  />
                  <DevicePhoneMobileIcon className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {d.device}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{d.ip}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {/* Room code the device is in, or a "no room" marker. */}
                  {d.code ? (
                    <span className="rounded-full bg-brand-600/15 px-2 py-0.5 font-mono font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                      {d.code}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-400 dark:bg-slate-800">
                      No room
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" />
                    {d.location
                      ? [d.location.city, d.location.country]
                          .filter(Boolean)
                          .join(', ') || 'Located'
                      : 'Private / unknown'}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  {d.online ? 'now' : formatRelative(d.disconnectedAt ?? d.connectedAt)}
                </div>
              </div>
            ))}
          </div>

          {/* All located devices on one map. */}
          <DeviceMap devices={devices} />
        </>
      )}
    </section>
  );
}
