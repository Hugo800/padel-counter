import {
  ArrowPathIcon,
  HomeIcon,
  PlusIcon,
  TrophyIcon,
} from '@heroicons/react/24/solid';
import type { MatchState } from '../types/match';
import { Button } from './ui/Button';

interface WinnerOverlayProps {
  state: MatchState;
  /** Called by the primary action button (new match / save result). */
  onFinish: () => void;
  /** Label for the primary action (default "New match"). */
  finishLabel?: string;
  /**
   * Replays the match with the exact same teams, format and rules. When
   * provided it becomes the *primary* action, because playing another round
   * against the same opponents is by far the most common next step – and it
   * saves re-typing the whole setup. Omitted where a replay makes no sense
   * (e.g. a tournament fixture, where the result has to be recorded).
   */
  onRematch?: () => void;
  /**
   * Ends the session for good and returns to the home screen. Offered as a
   * quiet third option for when the players are done for the day.
   */
  onHome?: () => void;
}

/**
 * A celebratory full-screen overlay shown when the match is decided.
 * Presents the winning team, the final set scores and the ways to carry on:
 * an instant rematch with the same setup, a new match with a changed setup,
 * or stopping altogether.
 */
export function WinnerOverlay({
  state,
  onFinish,
  finishLabel = 'New match',
  onRematch,
  onHome,
}: WinnerOverlayProps) {
  if (!state.winner) return null;

  const winner = state.config.teams[state.winner];
  const players = winner.players.filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md animate-slide-up p-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
          <TrophyIcon className="h-11 w-11 text-amber-500" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Match winner
        </p>
        <h2 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
          {winner.name}
        </h2>
        {players.length > 0 && (
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {players.join(' & ')}
          </p>
        )}

        {/* Final score: points tally in points mode, otherwise set scores */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {state.config.settings.matchType === 'points' ? (
            <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {state.games.A}-{state.games.B} points
            </span>
          ) : (
            state.completedSets.map((set, i) => (
              <span
                key={i}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-bold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {set.A}-{set.B}
              </span>
            ))
          )}
        </div>

        <div className="mt-8 flex flex-col gap-2">
          {onRematch && (
            <Button
              variant="primary"
              size="lg"
              onClick={onRematch}
              className="w-full"
            >
              <ArrowPathIcon className="h-6 w-6" />
              Rematch
            </Button>
          )}
          <Button
            // Once a rematch is on offer it takes the spotlight, so starting
            // over from scratch steps back to the secondary style.
            variant={onRematch ? 'secondary' : 'primary'}
            size="lg"
            onClick={onFinish}
            className="w-full"
          >
            {onRematch ? (
              <PlusIcon className="h-6 w-6" />
            ) : (
              <ArrowPathIcon className="h-6 w-6" />
            )}
            {finishLabel}
          </Button>

          {onHome && (
            <Button variant="ghost" onClick={onHome} className="w-full">
              <HomeIcon className="h-5 w-5" />
              Finish
            </Button>
          )}
        </div>

        {onRematch && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Rematch keeps the same teams, format and rules.
          </p>
        )}
      </div>
    </div>
  );
}
