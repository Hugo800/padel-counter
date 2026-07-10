import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import type { RoomMessage } from '../types/room';

interface MessageToastProps {
  message: RoomMessage;
  onDismiss: () => void;
}

/** How long the toast stays on screen before auto-dismissing (ms). */
const AUTO_DISMISS_MS = 10000;

/**
 * A non-blocking toast notification shown to everyone in a room when the admin
 * broadcasts a message. Unlike a modal it does not interrupt play: it slides in
 * at the top and disappears on its own after {@link AUTO_DISMISS_MS}, or when
 * the user taps it away.
 */
export function MessageToast({ message, onDismiss }: MessageToastProps) {
  // Auto-dismiss after the timeout. Re-armed whenever a new message arrives
  // (a fresh `message.at` restarts the effect).
  useEffect(() => {
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [message.at, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-2xl bg-brand-600 px-4 py-3 text-white shadow-xl shadow-brand-600/30"
      >
        <ChatBubbleLeftRightIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="flex-1 text-sm font-medium leading-snug">{message.text}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="-mr-1 -mt-1 rounded-full p-1 transition hover:bg-white/20"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
