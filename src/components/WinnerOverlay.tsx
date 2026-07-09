import { ArrowPathIcon, TrophyIcon } from '@heroicons/react/24/solid';
import type { MatchState } from '../types/match';
import { Button } from './ui/Button';

interface WinnerOverlayProps {
  state: MatchState;
  /** Called by the primary action button (new match / save result). */
  onFinish: () => void;
  /** Label for the primary action (default "New match"). */
  finishLabel?: string;
}

/**
 * A celebratory full-screen overlay shown when the match is decided.
 * Presents the winning team, the final set scores and a call to action to
 * start a fresh match.
 */
export function WinnerOverlay({
  state,
  onFinish,
  finishLabel = 'New match',
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

        <Button
          variant="primary"
          size="lg"
          onClick={onFinish}
          className="mt-8 w-full"
        >
          <ArrowPathIcon className="h-6 w-6" />
          {finishLabel}
        </Button>
      </div>
    </div>
  );
}
