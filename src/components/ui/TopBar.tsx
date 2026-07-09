import { ArrowLeftIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import type { Theme } from '../../hooks/useTheme';
import { IconButton } from './IconButton';

interface TopBarProps {
  title?: string;
  /** Shows a back arrow that calls this handler when provided. */
  onBack?: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  /** Optional extra controls rendered before the theme toggle. */
  children?: ReactNode;
}

/**
 * A shared top bar used across the setup, home and tournament screens.
 * Provides an optional back button, a centered title and the theme toggle so
 * light/dark mode is always reachable.
 */
export function TopBar({
  title,
  onBack,
  theme,
  onToggleTheme,
  children,
}: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-2">
      <div className="flex min-w-[3rem] items-center">
        {onBack && (
          <IconButton label="Back" onClick={onBack}>
            <ArrowLeftIcon className="h-5 w-5" />
          </IconButton>
        )}
      </div>

      {title && (
        <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
      )}

      <div className="flex min-w-[3rem] items-center justify-end gap-1">
        {children}
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
