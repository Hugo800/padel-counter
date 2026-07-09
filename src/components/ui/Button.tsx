import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-lg shadow-brand-600/30',
  secondary:
    'bg-slate-200 text-slate-800 hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:active:bg-slate-600',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800/70',
  danger:
    'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 active:bg-rose-500/30 dark:text-rose-400',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl gap-1.5',
  md: 'px-4 py-2.5 text-base rounded-2xl gap-2',
  lg: 'px-6 py-4 text-lg rounded-3xl gap-2.5',
};

/**
 * A polished, accessible button with Apple-inspired styling, several
 * variants and sizes, plus press/disabled animations.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold
        transition-all duration-150 active:scale-[0.97]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
        disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
