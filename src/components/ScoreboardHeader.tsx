import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ClockIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { BoltIcon, BoltSlashIcon } from '@heroicons/react/24/solid';
import { formatDuration } from '../hooks/useTimer';
import type { Theme } from '../hooks/useTheme';
import { IconButton } from './ui/IconButton';

/** Simple Apple-Watch glyph (rounded display + crown) for the watch toggle. */
function WatchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="6" y="6" width="12" height="12" rx="3.5" />
      <path d="M8.5 6l.6-2.2A1.5 1.5 0 0 1 10.55 2.7h2.9a1.5 1.5 0 0 1 1.45 1.1L15.5 6" />
      <path d="M8.5 18l.6 2.2a1.5 1.5 0 0 0 1.45 1.1h2.9a1.5 1.5 0 0 0 1.45-1.1l.6-2.2" />
      <path d="M19 10.5v3" />
    </svg>
  );
}

interface ScoreboardHeaderProps {
  seconds: number;
  theme: Theme;
  onToggleTheme: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  fullscreenSupported: boolean;
  keepAwake: boolean;
  onToggleKeepAwake: () => void;
  wakeLockSupported: boolean;
  /** Whether the compact Apple-Watch layout is currently active. */
  watchMode: boolean;
  /** Toggles the compact Apple-Watch layout. */
  onToggleWatch: () => void;
}

/**
 * The top bar of the match screen: shows the running match duration and the
 * secondary display controls (keep-awake, fullscreen and theme toggles).
 */
export function ScoreboardHeader({
  seconds,
  theme,
  onToggleTheme,
  isFullscreen,
  onToggleFullscreen,
  fullscreenSupported,
  keepAwake,
  onToggleKeepAwake,
  wakeLockSupported,
  watchMode,
  onToggleWatch,
}: ScoreboardHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2">
      {/* Match duration timer */}
      <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-slate-700 shadow-sm ring-1 ring-black/5 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-white/10 sm:gap-2 sm:px-4 sm:py-2 short:px-2 short:py-0.5">
        <ClockIcon className="h-5 w-5 short:h-4 short:w-4" />
        <span className="tabular-nums text-sm font-semibold sm:text-base" aria-label="Match duration">
          {formatDuration(seconds)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {wakeLockSupported && (
          <IconButton
            label={keepAwake ? 'Disable keep awake' : 'Keep screen awake'}
            onClick={onToggleKeepAwake}
            className={keepAwake ? 'text-amber-500' : ''}
          >
            {keepAwake ? (
              <BoltIcon className="h-5 w-5" />
            ) : (
              <BoltSlashIcon className="h-5 w-5" />
            )}
          </IconButton>
        )}

        {fullscreenSupported && (
          <IconButton
            label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="h-5 w-5" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5" />
            )}
          </IconButton>
        )}

        <IconButton
          label={watchMode ? 'Exit watch view' : 'Apple Watch view'}
          onClick={onToggleWatch}
          className={watchMode ? 'text-brand-500 dark:text-brand-400' : ''}
        >
          <WatchIcon className="h-5 w-5" />
        </IconButton>

        <IconButton
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </IconButton>
      </div>
    </header>
  );
}
