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
}: ScoreboardHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2">
      {/* Match duration timer */}
      <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-slate-700 shadow-sm ring-1 ring-black/5 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-white/10">
        <ClockIcon className="h-5 w-5" />
        <span className="tabular-nums font-semibold" aria-label="Match duration">
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
