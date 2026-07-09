import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

/**
 * A circular, icon-only button with an accessible label, used for the
 * scoreboard's header controls (theme, fullscreen, etc.).
 */
export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full
        text-slate-600 transition-all duration-150 active:scale-95
        hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800/70
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
        disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
