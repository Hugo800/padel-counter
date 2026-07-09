import { SignalIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface RoomBadgeProps {
  /** The active room code to display. */
  code: string;
  /** Leaves the current shared room. */
  onLeave: () => void;
}

/**
 * A small fixed badge shown on every screen while playing in a shared room,
 * so late joiners can always see the room code and leave when they are done.
 */
export function RoomBadge({ code, onLeave }: RoomBadgeProps) {
  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1.5 text-white shadow-lg shadow-brand-600/30">
      <SignalIcon className="h-4 w-4 animate-pulse" />
      <span className="text-xs font-medium opacity-90">Room</span>
      <span className="font-mono text-sm font-bold tracking-widest">{code}</span>
      <button
        type="button"
        onClick={onLeave}
        aria-label="Leave room"
        className="ml-1 rounded-full p-0.5 transition hover:bg-white/20"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
