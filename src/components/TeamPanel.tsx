import type { MatchState, TeamId } from '../types/match';
import { getPointLabel, isPointsMode } from '../lib/scoring';
import { ServeIndicator } from './ServeIndicator';

interface TeamPanelProps {
  state: MatchState;
  team: TeamId;
  accent: 'brand' | 'rose';
  onPoint: () => void;
  disabled: boolean;
}

/**
 * Displays a single team's live scoreboard column – name, players, current
 * point, games in the current set and sets won – together with the large
 * "add point" button that dominates the courtside layout.
 */
export function TeamPanel({
  state,
  team,
  accent,
  onPoint,
  disabled,
}: TeamPanelProps) {
  const info = state.config.teams[team];
  const pointLabel = getPointLabel(state, team);
  const isServing = state.server === team;
  const players = info.players.filter(Boolean);
  const pointsMode = isPointsMode(state.config.settings);

  const accentText = accent === 'brand' ? 'text-brand-600 dark:text-brand-400' : 'text-rose-500 dark:text-rose-400';
  const accentBg =
    accent === 'brand'
      ? 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 shadow-brand-600/30'
      : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-rose-500/30';
  // When this team serves, lift its card with a coloured ring + glow so it's
  // obvious at a glance who is on serve.
  const serveHighlight = isServing
    ? accent === 'brand'
      ? 'ring-2 ring-brand-500 shadow-lg shadow-brand-600/25 dark:ring-brand-400'
      : 'ring-2 ring-rose-500 shadow-lg shadow-rose-500/25 dark:ring-rose-400'
    : '';

  return (
    <section className="flex flex-1 flex-col gap-4">
      <div
        className={`card flex flex-1 flex-col items-center gap-4 p-5 text-center transition-all ${serveHighlight}`}
      >
        {/* Name + serve indicator */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {info.name}
          </h2>
          <ServeIndicator active={isServing} accent={accent} />
          {players.length > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {players.join(' & ')}
            </p>
          )}
        </div>

        {/* Current point – the hero number */}
        <div className="flex flex-1 items-center justify-center">
          <span
            className={`tabular-nums font-black leading-none ${accentText}
              text-7xl sm:text-8xl`}
          >
            {pointLabel}
          </span>
        </div>

        {/* Games + sets summary (or a single points tally in points mode) */}
        <div className="flex w-full items-stretch justify-center gap-3">
          {pointsMode ? (
            <StatBox label="Points" value={state.games[team]} />
          ) : (
            <>
              <StatBox label="Games" value={state.games[team]} />
              <StatBox label="Sets" value={state.sets[team]} />
            </>
          )}
        </div>
      </div>

      {/* Large scoring button */}
      <button
        type="button"
        onClick={onPoint}
        disabled={disabled}
        aria-label={`Point for ${info.name}`}
        className={`w-full rounded-3xl py-8 text-2xl font-bold text-white shadow-lg
          transition-all duration-150 active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2
          focus-visible:ring-offset-slate-100 dark:focus-visible:ring-offset-slate-950
          disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100
          ${accentBg}`}
      >
        + Point
      </button>
    </section>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
}

/** A small labelled score chip for games / sets. */
function StatBox({ label, value }: StatBoxProps) {
  return (
    <div className="flex min-w-[4.5rem] flex-col items-center rounded-2xl bg-slate-100 px-4 py-2 dark:bg-slate-800">
      <span
        key={value}
        className="animate-pop-in text-2xl font-bold tabular-nums text-slate-900 dark:text-white"
      >
        {value}
      </span>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}
