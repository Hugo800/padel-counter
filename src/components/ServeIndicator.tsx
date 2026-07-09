interface ServeIndicatorProps {
  active: boolean;
  /** Colour accent of the owning team, so the badge matches its column. */
  accent?: 'brand' | 'rose';
}

/**
 * A clearly-visible "Serving" badge shown for the team that currently serves.
 * Combines a pulsing ball with a text label so it's easy to read at a glance
 * from across the court. Renders nothing (but keeps layout height stable) when
 * the team is not serving.
 */
export function ServeIndicator({ active, accent = 'brand' }: ServeIndicatorProps) {
  if (!active) {
    // Reserve the same vertical space to avoid the layout jumping.
    return <span className="inline-block h-6" aria-hidden />;
  }

  const badge =
    accent === 'brand'
      ? 'bg-brand-600/15 text-brand-700 ring-brand-500/40 dark:text-brand-300'
      : 'bg-rose-500/15 text-rose-600 ring-rose-500/40 dark:text-rose-300';
  const ball = accent === 'brand' ? 'bg-brand-500' : 'bg-rose-500';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${badge}`}
      title="Serving"
      aria-label="Serving"
    >
      <span className="relative inline-flex h-2.5 w-2.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${ball}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${ball}`} />
      </span>
      Serving
    </span>
  );
}
