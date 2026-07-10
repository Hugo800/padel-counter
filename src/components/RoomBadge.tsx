import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

interface RoomBadgeProps {
  /** The active room code to display. */
  code: string;
  /** Leaves the current shared room. */
  onLeave: () => void;
  /** Extra classes for the wrapper, e.g. spacing where it is embedded. */
  className?: string;
}

/**
 * A discreet, inline badge showing the current shared-room code. It sits in the
 * normal page flow (it is intentionally *not* a floating/fixed overlay), so it
 * no longer follows the page when scrolling. Callers embed it where it fits the
 * layout — e.g. at the bottom of the match setup and just under the timer on the
 * live scoreboard. It is a subtle neutral pill (not a coloured notification
 * banner) so it never distracts from play.
 *
 * Leaving is a deliberate two-step action: tapping the badge reveals a
 * "Leave room" button, so a stray tap can no longer kick the user out of the
 * room by accident. The leave button is absolutely positioned below the chip so
 * revealing it does not shift the surrounding layout.
 */
export function RoomBadge({ code, onLeave, className = '' }: RoomBadgeProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collapse the leave button when clicking/tapping anywhere else.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`relative flex justify-center ${className}`}
    >
      {/* Discreet, always-visible room-code chip. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide leave option' : 'Show leave option'}
        className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-slate-500 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white/90 dark:bg-slate-900/70 dark:text-slate-400 dark:ring-white/10 dark:hover:bg-slate-900/90"
      >
        <span className="text-[11px] font-medium uppercase tracking-wide opacity-70">
          Room
        </span>
        <span className="font-mono text-xs font-bold tracking-widest text-slate-700 dark:text-slate-200">
          {code}
        </span>
      </button>

      {/* Deliberate leave action, only shown after tapping the badge. It is
          absolutely positioned so it overlays rather than pushes content. */}
      {open && (
        <button
          type="button"
          onClick={onLeave}
          className="absolute left-1/2 top-full z-20 mt-1.5 flex -translate-x-1/2 animate-fade-in items-center gap-1.5 whitespace-nowrap rounded-full bg-rose-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-rose-500/30 backdrop-blur transition hover:bg-rose-600"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Leave room
        </button>
      )}
    </div>
  );
}
