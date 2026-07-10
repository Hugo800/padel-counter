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
 * live scoreboard.
 *
 * It is styled in the same padel-green as the tournament round pill and carries
 * a pulsing "live" dot to signal that the room is connected and syncing in real
 * time.
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
      {/* Discreet, always-visible room-code chip in padel green with a pulsing
          live dot to signal the real-time connection. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide leave option' : 'Show leave option'}
        className="flex items-center gap-2 rounded-full bg-brand-600/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-600 transition hover:bg-brand-600/25 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
      >
        {/* Pulsing "live" indicator. */}
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
        </span>
        <span className="opacity-70">Room</span>
        <span className="font-mono font-bold normal-case tracking-widest text-brand-700 dark:text-brand-200">
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
