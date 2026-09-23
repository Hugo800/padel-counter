import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ArrowUturnLeftIcon,
  HomeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import {
  canChooseFirstServer,
  changeOfEndsKey,
  getPointLabel,
  hasAdvantage,
  isChangeOfEndsDue,
  isDeuce,
  isPointsMode,
} from '../lib/scoring';
import type { MatchState, TeamId } from '../types/match';
import { type TeamAccent } from '../lib/teamAccent';
import type { Theme } from '../hooks/useTheme';
import { Button } from './ui/Button';
import { ScoreboardHeader } from './ScoreboardHeader';
import { RoomBadge } from './RoomBadge';
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
  /**
   * Replays the finished match with the same teams and rules. When given, the
   * winner overlay offers it as the primary action so nobody has to retype the
   * setup just to play another round.
   */
  onRematch?: () => void;
  /**
   * Ends the match and returns to the home screen. When given, a *Home* button
   * joins the control bar and the winner overlay, so stopping is always one tap
   * away instead of a detour via the setup screen.
   */
  onHome?: () => void;
  /**
   * Corrects who serves first. Only offered until the first point is played -
   * mis-picking the server on the setup screen was otherwise unfixable without
   * restarting the whole match.
   */
  onSetFirstServer?: (team: TeamId) => void;
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
  /** Active shared-room code, shown inline under the timer when online. */
  roomCode?: string | null;
  /** Leaves the current shared room. */
  onLeaveRoom?: () => void;
  /**
   * When true the two team panels are mirrored, so the team shown on the left
   * is the one on the left-hand side of the court. Purely a per-device display
   * preference – it never touches the score itself.
   */
  sidesSwapped?: boolean;
  /** Mirrors the two team panels (called when players change ends). */
  onToggleSides?: () => void;
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
    onRematch,
    onHome,
    onSetFirstServer,
    matchLabel,
    sidesSwapped = false,
    onToggleSides,
  } = props;

  const finished = state.winner !== null;
  const status = getStatusMessage(state);
  // Left-to-right rendering order of the two teams. Swapping only reorders the
  // panels; each team keeps its own colour, score and point handler.
  const order: TeamId[] = sidesSwapped ? ['B', 'A'] : ['A', 'B'];
  const pointHandlers: Record<TeamId, () => void> = {
    A: onPointA,
    B: onPointB,
  };
  const accents: Record<TeamId, TeamAccent> = { A: 'a', B: 'b' };

  // Change-of-ends prompt. `isChangeOfEndsDue` is only true between points, so
  // it clears itself as soon as play resumes; the key remembers the one the
  // players already acted on so it does not re-appear while they walk over.
  const endsKey = changeOfEndsKey(state);
  const [handledEndsKey, setHandledEndsKey] = useState<string | null>(null);
  const changeEndsDue =
    !!onToggleSides && isChangeOfEndsDue(state) && handledEndsKey !== endsKey;

  // Before the first point the serve can still be corrected.
  const pickServer = onSetFirstServer && canChooseFirstServer(state);

  // Two-step Reset: the first tap arms it, the second wipes the score. On a
  // phone this button sits under the thumb, and Reset is the one control here
  // that throws work away.
  const [resetArmed, setResetArmed] = useState(false);
  useEffect(() => {
    if (!resetArmed) return;
    const id = setTimeout(() => setResetArmed(false), 4000);
    return () => clearTimeout(id);
  }, [resetArmed]);

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
          sidesSwapped={sidesSwapped}
          onToggleSides={onToggleSides}
        />
        <WinnerOverlay
          state={state}
          onFinish={onFinish ?? onExit}
          finishLabel={finishLabel}
          onRematch={onRematch}
          onHome={onHome}
        />
      </>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 short:gap-1.5 short:px-2 short:py-1.5">
      {/* Screen readers get the score spoken on every change; the visual
          scoreboard alone says nothing to VoiceOver / TalkBack. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announceScore(state)}
      </p>

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

      {/* Inline room code, sitting just under the timer (only online). */}
      {props.roomCode && props.onLeaveRoom && (
        <RoomBadge code={props.roomCode} onLeave={props.onLeaveRoom} />
      )}

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

      {/* Change ends: mirrors the panels so the on-court sides match reality.
          When the rules call for a change of ends the same control steps
          forward and says so, instead of waiting to be remembered. */}
      {onToggleSides && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setHandledEndsKey(endsKey);
              onToggleSides();
            }}
            aria-pressed={sidesSwapped}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide
              transition-colors active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
              ${
                changeEndsDue
                  ? 'animate-fade-in bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                  : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300/70 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700/70'
              }`}
          >
            <ArrowsRightLeftIcon className="h-4 w-4" />
            {changeEndsDue ? 'Change ends' : 'Swap sides'}
          </button>
        </div>
      )}

      {/* Who serves first - only until the match is under way. */}
      {pickServer && (
        <div className="flex items-center justify-center gap-2 short:hidden">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Serve
          </span>
          {order.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => onSetFirstServer(team)}
              aria-pressed={state.server === team}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                ${
                  state.server === team
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300/70 dark:bg-slate-800/70 dark:text-slate-300'
                }`}
            >
              {state.config.teams[team].name}
            </button>
          ))}
        </div>
      )}

      {/* Team panels */}
      <div className="flex flex-1 gap-2 sm:gap-4">
        {order.map((team) => (
          <TeamPanel
            key={team}
            state={state}
            team={team}
            accent={accents[team]}
            onPoint={pointHandlers[team]}
            disabled={finished}
          />
        ))}
      </div>

      {/* Sideways on a phone every millimetre goes to the score itself. */}
      <div className="short:hidden">
        <SetHistory state={state} />
      </div>

      {/* Secondary controls. The Home button only appears outside a
          tournament, where leaving is what the "Back" action already does. */}
      <div
        className={`grid gap-2 short:gap-1.5 ${
          onHome ? 'grid-cols-4' : 'grid-cols-3'
        }`}
      >
        <Button
          variant="secondary"
          onClick={onUndo}
          disabled={!canUndo}
          className="px-2 text-sm sm:px-4 sm:text-base"
        >
          <ArrowUturnLeftIcon className="h-5 w-5" />
          Undo
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (!resetArmed) {
              setResetArmed(true);
              return;
            }
            setResetArmed(false);
            onReset();
          }}
          className={`px-2 text-sm sm:px-4 sm:text-base ${
            resetArmed ? 'ring-2 ring-rose-500' : ''
          }`}
        >
          <ArrowPathIcon className="h-5 w-5" />
          {resetArmed ? 'Sure?' : 'Restart'}
        </Button>
        <Button
          variant="ghost"
          onClick={onExit}
          className="px-2 text-sm sm:px-4 sm:text-base"
        >
          <PlusIcon className="h-5 w-5" />
          {exitLabel}
        </Button>
        {onHome && (
          <Button
            variant="ghost"
            onClick={onHome}
            className="px-2 text-sm sm:px-4 sm:text-base"
          >
            <HomeIcon className="h-5 w-5" />
            Home
          </Button>
        )}
      </div>

      {/* Discoverability for the shortcuts, on pointer devices only - a phone
          has no keyboard and the line would just eat vertical space. */}
      <p className="hidden text-center text-xs text-slate-400 md:block short:md:hidden">
        <kbd className="font-sans font-semibold">&larr;</kbd> /{' '}
        <kbd className="font-sans font-semibold">&rarr;</kbd> score &middot;{' '}
        <kbd className="font-sans font-semibold">Ctrl</kbd>+
        <kbd className="font-sans font-semibold">Z</kbd> undo
      </p>

      <WinnerOverlay
        state={state}
        onFinish={onFinish ?? onExit}
        finishLabel={finishLabel}
        onRematch={onRematch}
        onHome={onHome}
      />
    </div>
  );
}

/**
 * The spoken version of the scoreboard, for the visually-hidden live region.
 *
 * Screen readers otherwise see only a pile of numbers with no relationship to
 * each other, and never learn that the score changed at all.
 */
function announceScore(state: MatchState): string {
  const a = state.config.teams.A.name;
  const b = state.config.teams.B.name;

  if (state.winner) {
    return `${state.config.teams[state.winner].name} wins the match.`;
  }

  const points = `${a} ${getPointLabel(state, 'A')}, ${b} ${getPointLabel(
    state,
    'B',
  )}`;

  if (isPointsMode(state.config.settings)) {
    return `${points}. Points ${state.games.A} to ${state.games.B}.`;
  }

  const serving = `Serving: ${state.config.teams[state.server].name}.`;
  const games = `Games ${state.games.A} to ${state.games.B}.`;
  const sets = `Sets ${state.sets.A} to ${state.sets.B}.`;
  const tiebreak = state.tiebreak ? 'Tiebreak. ' : '';
  return `${tiebreak}${points}. ${games} ${sets} ${serving}`;
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
