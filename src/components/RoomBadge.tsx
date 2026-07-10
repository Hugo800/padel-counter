import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

interface RoomBadgeProps {
  /** The active room code to display. */
  code: string;
  /** Leaves the current shared room. */
  onLeave: () => void;
}

/**
 * A discreet, fixed badge shown in the bottom-left corner while playing in a
 * shared room, so everyone can always see the room code. It is intentionally
 * understated (not a notification-style banner) and never covers the
 * scoreboard's controls.
 *
 * Leaving is a deliberate two-step action: tapping the badge reveals a
 * "Leave room" button, so a stray tap can no longer kick the user out of the
 * room by accident.
 */
export function RoomBadge({ code, onLeave }: RoomBadgeProps) {
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
      className="fixed bottom-3 left-3 z-40 flex flex-col items-start gap-1.5"
    >
      {/* Deliberate leave action, only shown after tapping the badge. */}
      {open && (
        <button
          type="button"
          onClick={onLeave}
          className="flex animate-fade-in items-center gap-1.5 rounded-full bg-rose-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-rose-500/30 backdrop-blur transition hover:bg-rose-600"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          Leave room
        </button>
      )}

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
    </div>
  );
}
