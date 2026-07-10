import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { isDeuce, hasAdvantage } from '../lib/scoring';
import type { MatchState } from '../types/match';
import type { Theme } from '../hooks/useTheme';
import { Button } from './ui/Button';
import { ScoreboardHeader } from './ScoreboardHeader';
import { SetHistory } from './SetHistory';
import { TeamPanel } from './TeamPanel';
import { WatchScoreboard } from './WatchScoreboard';
import { WinnerOverlay } from './WinnerOverlay';

interface MatchScreenProps {
  state: MatchState;
  canUndo: boolean;
  onPointA: () => void;
  onPointB: () => void;
  onUndo: () => void;
  onReset: () => void;
  /** Secondary "exit" action (leave the match). */
  onExit: () => void;
  /** Label for the secondary exit button (default "New"). */
  exitLabel?: string;
  /** Winner-overlay primary action (default = same as exit). */
  onFinish?: () => void;
  /** Label for the winner-overlay button (default "New match"). */
  finishLabel?: string;
  /** Optional context label shown above the scoreboard (e.g. tournament round). */
  matchLabel?: string;
  // Header controls
  seconds: number;
  theme: Theme;
  onToggleTheme: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  fullscreenSupported: boolean;
  keepAwake: boolean;
  onToggleKeepAwake: () => void;
  wakeLockSupported: boolean;
  /** Whether the compact Apple-Watch layout is active. */
  watchMode: boolean;
  /** Toggles the compact Apple-Watch layout. */
  onToggleWatch: () => void;
}

/**
 * The live match view. Lays out the two team panels, the running set history,
 * a contextual status banner (deuce / advantage / tiebreak / winner) and the
 * secondary control bar. Score buttons are disabled once a winner exists.
 */
export function MatchScreen(props: MatchScreenProps) {
  const {
    state,
    canUndo,
    onPointA,
    onPointB,
    onUndo,
    onReset,
    onExit,
    exitLabel = 'New',
    onFinish,
    finishLabel = 'New match',
    matchLabel,
  } = props;

  const finished = state.winner !== null;
  const status = getStatusMessage(state);

  // Compact Apple-Watch layout: replaces the full scoreboard with a small,
  // centred watch-style view. The winner overlay still renders on top so a
  // finished match is celebrated in either layout.
  if (props.watchMode) {
    return (
      <>
        <WatchScoreboard
          state={state}
          canUndo={canUndo}
          onPointA={onPointA}
          onPointB={onPointB}
          onUndo={onUndo}
          seconds={props.seconds}
          onExitWatch={props.onToggleWatch}
        />
        <WinnerOverlay
          state={state}
          onFinish={onFinish ?? onExit}
          finishLabel={finishLabel}
        />
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-4 py-4">
      <ScoreboardHeader
        seconds={props.seconds}
        theme={props.theme}
        onToggleTheme={props.onToggleTheme}
        isFullscreen={props.isFullscreen}
        onToggleFullscreen={props.onToggleFullscreen}
        fullscreenSupported={props.fullscreenSupported}
        keepAwake={props.keepAwake}
        onToggleKeepAwake={props.onToggleKeepAwake}
        wakeLockSupported={props.wakeLockSupported}
        watchMode={props.watchMode}
        onToggleWatch={props.onToggleWatch}
      />

      {/* Contextual status banner */}
      {(matchLabel || status) && (
        <div className="flex flex-col items-center gap-1">
          {matchLabel && (
            <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
              {matchLabel}
            </span>
          )}
          {status && (
            <div className="w-full animate-fade-in rounded-2xl bg-brand-600/10 py-2 text-center text-sm font-semibold uppercase tracking-widest text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              {status}
            </div>
          )}
        </div>
      )}

      {/* Team panels */}
      <div className="flex flex-1 gap-3 sm:gap-4">
        <TeamPanel
          state={state}
          team="A"
          accent="brand"
          onPoint={onPointA}
          disabled={finished}
        />
        <TeamPanel
          state={state}
          team="B"
          accent="rose"
          onPoint={onPointB}
          disabled={finished}
        />
      </div>

      <SetHistory state={state} />

      {/* Secondary controls */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={onUndo} disabled={!canUndo}>
          <ArrowUturnLeftIcon className="h-5 w-5" />
          Undo
        </Button>
        <Button variant="danger" onClick={onReset}>
          <ArrowPathIcon className="h-5 w-5" />
          Reset
        </Button>
        <Button variant="ghost" onClick={onExit}>
          <PlusIcon className="h-5 w-5" />
          {exitLabel}
        </Button>
      </div>

      <WinnerOverlay
        state={state}
        onFinish={onFinish ?? onExit}
        finishLabel={finishLabel}
      />
    </div>
  );
}

/**
 * Derives a short human-readable status line for the current game situation.
 * Returns an empty string when there is nothing special to announce.
 */
function getStatusMessage(state: MatchState): string {
  if (state.winner) return '';
  if (state.tiebreak) return 'Tiebreak';
  if (hasAdvantage(state, 'A')) {
    return `Advantage ${state.config.teams.A.name}`;
  }
  if (hasAdvantage(state, 'B')) {
    return `Advantage ${state.config.teams.B.name}`;
  }
  if (isDeuce(state)) return 'Deuce';
  return '';
}
