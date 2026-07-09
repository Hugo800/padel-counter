import { TrophyIcon, UserGroupIcon } from '@heroicons/react/24/solid';
import {
  ArrowRightIcon,
  ArrowRightOnRectangleIcon,
  SignalIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import type { Theme } from '../hooks/useTheme';
import { TopBar } from './ui/TopBar';

interface HomeScreenProps {
  onDoubles: () => void;
  onTournament: () => void;
  /** True when a saved tournament can be resumed. */
  hasTournament: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  // --- Online multiplayer -------------------------------------------------
  /** Whether the user is currently in a shared room. */
  online: boolean;
  /** True while a create/join request is in flight. */
  connecting: boolean;
  /** The active room code, or null when offline. */
  roomCode: string | null;
  /** Last join/connection error, or null. */
  roomError: string | null;
  /** Creates a new shared room. */
  onCreateRoom: () => void;
  /** Joins an existing room by code. */
  onJoinRoom: (code: string) => void;
  /** Leaves the current room. */
  onLeaveRoom: () => void;
}

/**
 * The very first screen. Lets the user choose between a normal doubles match
 * (4 players) and tournament mode (many players, random teams + schedule).
 * It also hosts the "play together" panel for creating or joining a shared
 * online room so friends can score the same match from their own phones.
 */
export function HomeScreen({
  onDoubles,
  onTournament,
  hasTournament,
  theme,
  onToggleTheme,
  online,
  connecting,
  roomCode,
  roomError,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
}: HomeScreenProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-8 px-4 py-6">
      <TopBar theme={theme} onToggleTheme={onToggleTheme} />

      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Padel Score
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          How do you want to play today?
        </p>
      </header>

      <div className="grid flex-1 content-center gap-4 sm:grid-cols-2">
        <ModeCard
          icon={<UserGroupIcon className="h-8 w-8" />}
          title="Doubles"
          description="A single match with two teams of two players."
          accent="brand"
          onClick={onDoubles}
        />
        <ModeCard
          icon={<TrophyIcon className="h-8 w-8" />}
          title="Tournament"
          description="Many players, randomly drawn teams and a full match plan."
          accent="rose"
          badge={hasTournament ? 'Resume' : undefined}
          onClick={onTournament}
        />
      </div>

      <OnlinePanel
        online={online}
        connecting={connecting}
        roomCode={roomCode}
        roomError={roomError}
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
        onLeaveRoom={onLeaveRoom}
      />
    </div>
  );
}

interface OnlinePanelProps {
  online: boolean;
  connecting: boolean;
  roomCode: string | null;
  roomError: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
}

/**
 * "Play together" panel. When offline it offers creating a room or joining one
 * by code; when online it shows the active room code so friends can join and
 * everyone scores the same match live.
 */
function OnlinePanel({
  online,
  connecting,
  roomCode,
  roomError,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
}: OnlinePanelProps) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <div className="card flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <UsersIcon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Play together
        </h2>
      </div>

      {online && roomCode ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Share this code with your friends. Everyone in the room scores the
            same match live.
          </p>
          <div className="flex items-center justify-between rounded-2xl bg-brand-600/10 px-4 py-3">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
              <SignalIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Room code</span>
            </div>
            <span className="font-mono text-2xl font-bold tracking-[0.3em] text-slate-900 dark:text-white">
              {roomCode}
            </span>
          </div>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-night-700 dark:text-slate-300 dark:hover:bg-night-800"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Leave room
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Want your friends to give points too? Create a room and share the
            code, or join a friend's room.
          </p>
          <button
            type="button"
            disabled={connecting}
            onClick={onCreateRoom}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <SignalIcon className="h-4 w-4" />
            {connecting ? 'Connecting…' : 'Create a room'}
          </button>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onJoinRoom(joinCode);
            }}
          >
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              maxLength={6}
              autoCapitalize="characters"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-lg uppercase tracking-widest text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 dark:border-night-700 dark:bg-night-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={connecting || joinCode.trim().length === 0}
              className="shrink-0 rounded-xl border border-brand-600 px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-600/10 disabled:opacity-50 dark:text-brand-400"
            >
              Join
            </button>
          </form>

          {roomError && (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {roomError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: 'brand' | 'rose';
  badge?: string;
  onClick: () => void;
}

/** A large, tappable card representing one of the play modes. */
function ModeCard({
  icon,
  title,
  description,
  accent,
  badge,
  onClick,
}: ModeCardProps) {
  const iconWrap =
    accent === 'brand'
      ? 'bg-brand-600/15 text-brand-600 dark:text-brand-400'
      : 'bg-brand-400/15 text-brand-500 dark:text-brand-300';

  return (
    <button
      type="button"
      onClick={onClick}
      className="card group flex flex-col items-start gap-4 p-6 text-left transition-all
        duration-150 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="flex w-full items-center justify-between">
        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconWrap}`}>
          {icon}
        </span>
        {badge && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            {badge}
          </span>
        )}
      </div>
      <div>
        <h2 className="flex items-center gap-1 text-2xl font-bold text-slate-900 dark:text-white">
          {title}
          <ArrowRightIcon className="h-5 w-5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </button>
  );
}
