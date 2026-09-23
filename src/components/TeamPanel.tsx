import type { MatchState, TeamId } from '../types/match';
import { getPointLabel, isPointsMode } from '../lib/scoring';
import { TEAM_ACCENT, type TeamAccent } from '../lib/teamAccent';
import { ServeIndicator } from './ServeIndicator';

interface TeamPanelProps {
  state: MatchState;
  team: TeamId;
  accent: TeamAccent;
  onPoint: () => void;
  disabled: boolean;
}

/**
 * One team's live column - name, players, current point, games and sets -
 * and the tap target that scores a point for them.
 *
 * The **entire column is the button**, not just the bar at the bottom. On a
 * phone held at the net that roughly doubles the target, which is what this
 * app is used on; the bar stays as the visual affordance. A mis-tap costs one
 * tap on Undo, and Undo sits directly below.
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
  const c = TEAM_ACCENT[accent];

  // When this team serves, lift its card with a coloured ring + glow so it's
  // obvious at a glance who is on serve.
  const serveHighlight = isServing ? c.serveRing : '';

  return (
    <button
      type="button"
      onClick={onPoint}
      disabled={disabled}
      aria-label={`Point for ${info.name}`}
      className={`group flex min-w-0 flex-1 flex-col gap-2 text-left
        transition-transform duration-150 active:scale-[0.99]
        focus-visible:outline-none disabled:cursor-not-allowed
        disabled:opacity-60 disabled:active:scale-100 sm:gap-4`}
    >
      <div
        className={`card flex flex-1 flex-col items-center gap-2 p-3 text-center transition-all
          group-focus-visible:ring-2 group-focus-visible:ring-brand-500
          sm:gap-4 sm:p-5 short:gap-1 short:p-2 ${serveHighlight}`}
      >
        {/* Name + serve indicator */}
        <div className="flex w-full flex-col items-center gap-1.5 sm:gap-2 short:gap-0.5">
          <h2 className="w-full truncate text-base font-bold text-slate-900 dark:text-white sm:text-2xl short:text-sm">
            {info.name}
          </h2>
          <ServeIndicator active={isServing} accent={accent} />
          {players.length > 0 && (
            <p className="w-full truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm short:hidden">
              {players.join(' & ')}
            </p>
          )}
        </div>

        {/* Current point */}
        <div className="flex flex-1 items-center justify-center">
          <span
            className={`tabular-nums font-black leading-none ${c.text}
              text-6xl sm:text-8xl short:text-5xl`}
          >
            {pointLabel}
          </span>
        </div>

        {/* Games + sets summary (or a single points tally in points mode).
            Games carry the most weight after the point itself - that is the
            number you glance at from the baseline - so sets ride along as a
            smaller chip. */}
        <div className="flex w-full items-stretch justify-center gap-2 sm:gap-3">
          {pointsMode ? (
            <StatBox label="Points" value={state.games[team]} primary />
          ) : (
            <>
              <StatBox label="Games" value={state.games[team]} primary />
              <StatBox label="Sets" value={state.sets[team]} />
            </>
          )}
        </div>
      </div>

      {/* Visual affordance for the tap target that is the whole column. */}
      <span
        aria-hidden
        className={`w-full rounded-3xl py-6 text-center text-xl font-bold text-white shadow-lg
          transition-all duration-150
          group-disabled:opacity-40
          sm:py-8 sm:text-2xl short:py-3 short:text-lg
          ${c.button}`}
      >
        + Point
      </span>
    </button>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  /** Renders the chip larger; used for the number that matters most. */
  primary?: boolean;
}

/** A small labelled score chip for games / sets. */
function StatBox({ label, value, primary = false }: StatBoxProps) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center rounded-2xl px-2 py-1.5 sm:px-4 sm:py-2
        ${
          primary
            ? 'flex-[1.6] bg-slate-200 dark:bg-slate-700/70'
            : 'flex-1 bg-slate-100 dark:bg-slate-800'
        }
        sm:min-w-[4.5rem] sm:flex-none`}
    >
      <span
        key={value}
        className={`animate-pop-in font-bold tabular-nums text-slate-900 dark:text-white
          ${primary ? 'text-2xl sm:text-3xl short:text-xl' : 'text-xl sm:text-2xl short:text-lg'}`}
      >
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">
        {label}
      </span>
    </div>
  );
}
