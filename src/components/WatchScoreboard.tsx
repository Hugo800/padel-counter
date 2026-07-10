import { ArrowUturnLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatDuration } from '../hooks/useTimer';
import { getPointLabel, isDeuce, isPointsMode } from '../lib/scoring';
import type { MatchState, TeamId } from '../types/match';

interface WatchScoreboardProps {
  state: MatchState;
  canUndo: boolean;
  onPointA: () => void;
  onPointB: () => void;
  onUndo: () => void;
  /** Running match duration in seconds (shown compactly at the top). */
  seconds: number;
  /** Leaves the watch layout and returns to the full scoreboard. */
  onExitWatch: () => void;
}

/**
 * A compact, Apple-Watch-optimised scoreboard.
 *
 * The layout mimics a watch display: a small, centred rounded frame with the
 * two teams stacked vertically as large tap targets. Everything is scaled and
 * spaced so it stays readable and comfortably tappable on a very small screen
 * (≈ 40–45 mm watch), while still working fine mirrored on a phone.
 */
export function WatchScoreboard({
  state,
  canUndo,
  onPointA,
  onPointB,
  onUndo,
  seconds,
  onExitWatch,
}: WatchScoreboardProps) {
  const finished = state.winner !== null;
  const pointsMode = isPointsMode(state.config.settings);
  const status = state.tiebreak ? 'TIEBREAK' : isDeuce(state) ? 'DEUCE' : '';

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-6">
      {/* Watch "bezel": a black rounded frame that keeps the content tight and
          centred, just like a physical watch display. */}
      <div className="w-full max-w-[16rem] rounded-[2.75rem] bg-black p-3 text-white shadow-2xl ring-1 ring-white/10">
        {/* Top row: duration + exit-watch control */}
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="tabular-nums text-xs font-semibold text-slate-400">
            {formatDuration(seconds)}
          </span>
          {status && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-200">
              {status}
            </span>
          )}
          <button
            type="button"
            onClick={onExitWatch}
            aria-label="Exit watch view"
            title="Exit watch view"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 active:scale-95"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Two stacked team rows, each a large tap target. */}
        <div className="flex flex-col gap-2">
          <WatchTeamRow
            state={state}
            team="A"
            accent="brand"
            pointsMode={pointsMode}
            onPoint={onPointA}
            disabled={finished}
          />
          <WatchTeamRow
            state={state}
            team="B"
            accent="rose"
            pointsMode={pointsMode}
            onPoint={onPointB}
            disabled={finished}
          />
        </div>

        {/* Undo — the only secondary control that fits a watch comfortably. */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUturnLeftIcon className="h-4 w-4" />
          Undo
        </button>
      </div>
    </div>
  );
}

interface WatchTeamRowProps {
  state: MatchState;
  team: TeamId;
  accent: 'brand' | 'rose';
  pointsMode: boolean;
  onPoint: () => void;
  disabled: boolean;
}

/** One tappable team row inside the watch frame. */
function WatchTeamRow({
  state,
  team,
  accent,
  pointsMode,
  onPoint,
  disabled,
}: WatchTeamRowProps) {
  const info = state.config.teams[team];
  const pointLabel = getPointLabel(state, team);
  const isServing = state.server === team;

  const accentText =
    accent === 'brand' ? 'text-brand-400' : 'text-rose-400';
  const rowBg =
    accent === 'brand'
      ? 'bg-brand-600/15 active:bg-brand-600/25'
      : 'bg-rose-500/15 active:bg-rose-500/25';
  const dot = accent === 'brand' ? 'bg-brand-400' : 'bg-rose-400';
  const serveRing = isServing
    ? accent === 'brand'
      ? 'ring-1 ring-brand-400/70'
      : 'ring-1 ring-rose-400/70'
    : 'ring-1 ring-white/5';

  // Compact "games / sets" (or the single points tally in points mode).
  const summary = pointsMode
    ? `${state.games[team]} pts`
    : `${state.sets[team]} · ${state.games[team]}`;

  return (
    <button
      type="button"
      onClick={onPoint}
      disabled={disabled}
      aria-label={`Point for ${info.name}`}
      className={`flex items-center justify-between gap-2 rounded-3xl px-3.5 py-3 text-left transition-all
        ${rowBg} ${serveRing}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400
        disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {/* Serve dot (pulses while this team serves). */}
          <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
            {isServing && (
              <span className={`absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75 ${dot}`} />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${isServing ? dot : 'bg-white/20'}`}
            />
          </span>
          <span className="truncate text-sm font-bold text-white">
            {info.name}
          </span>
        </div>
        <span className="mt-0.5 block pl-3.5 text-[11px] font-medium tabular-nums text-slate-400">
          {summary}
        </span>
      </div>

      {/* The hero number for this team. */}
      <span className={`shrink-0 tabular-nums text-4xl font-black leading-none ${accentText}`}>
        {pointLabel}
      </span>
    </button>
  );
}
