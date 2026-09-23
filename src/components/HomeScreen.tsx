import { TrophyIcon, UserGroupIcon, UserIcon } from '@heroicons/react/24/solid';
import {
  ArrowRightIcon,
  ArrowRightOnRectangleIcon,
  SignalIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { SPORT_LABEL, type Sport } from '../hooks/useSport';
import type { Theme } from '../hooks/useTheme';
import { TopBar } from './ui/TopBar';

interface HomeScreenProps {
  /** The sport picked on the landing screen; drives copy and available modes. */
  sport: Sport;
  /** Returns to the sport picker. */
  onChangeSport: () => void;
  onSingles: () => void;
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
 * The very first screen after a sport was picked. Lets the user choose between
 * a doubles match (4 players) and tournament mode (many players, random teams
 * + schedule); tennis additionally offers a singles (1 vs 1) match, which does
 * not exist in padel.
 * It also hosts the "play together" panel for creating or joining a shared
 * online room so friends can score the same match from their own phones.
 */
export function HomeScreen({
  sport,
  onChangeSport,
  onSingles,
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
  // Padel is played 2 vs 2 only, so the singles card is tennis-exclusive.
  const hasSingles = sport === 'tennis';

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 px-4 py-5 sm:gap-8 sm:py-6">
      <TopBar theme={theme} onToggleTheme={onToggleTheme} onBack={onChangeSport} />

      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {SPORT_LABEL[sport]} Score
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          How do you want to play today?
        </p>
      </header>

      <div
        className={`grid flex-1 content-center gap-3 sm:gap-4 ${
          hasSingles ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {hasSingles && (
          <ModeCard
            icon={<UserIcon className="h-8 w-8" />}
            title="Singles"
            description="A 1 vs 1 match — including the short First to 3 format."
            accent="brand"
            onClick={onSingles}
          />
        )}
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
          accent="teamb"
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
    <div className="card flex flex-col gap-4 p-4 sm:p-6">
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
  accent: 'brand' | 'teamb';
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
      className="card group flex w-full items-center gap-4 p-4 text-left transition-all
        duration-150 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
        sm:flex-col sm:items-start sm:p-6"
    >
      {/* On phones the icon sits next to the text (compact list row); from the
          `sm` breakpoint up it moves onto its own line for the card look. */}
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconWrap} sm:h-14 sm:w-14`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-1 text-lg font-bold text-slate-900 dark:text-white sm:text-2xl">
          <span className="truncate">{title}</span>
          {badge && (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              {badge}
            </span>
          )}
          <ArrowRightIcon className="hidden h-5 w-5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 sm:inline" />
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 sm:mt-1">
          {description}
        </p>
      </div>
    </button>
  );
}
