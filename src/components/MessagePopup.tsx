import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { RoomMessage } from '../types/room';
import { Button } from './ui/Button';

interface MessagePopupProps {
  message: RoomMessage;
  onDismiss: () => void;
}

/**
 * A modal popup shown to everyone in a room when the admin broadcasts a
 * message. It overlays the whole screen so the note is impossible to miss and
 * stays until the user explicitly dismisses it.
 */
export function MessagePopup({ message, onDismiss }: MessagePopupProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Message from the organiser"
      onClick={onDismiss}
    >
      <div
        className="card relative flex w-full max-w-sm animate-pop-in flex-col items-center gap-4 p-6 text-center"
        // Stop clicks inside the card from dismissing via the backdrop handler.
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-slate-200/70 dark:hover:bg-slate-800/70"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600/15 text-brand-600 dark:text-brand-400">
          <ChatBubbleLeftRightIcon className="h-7 w-7" />
        </span>

        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Message
        </h2>
        <p className="text-lg font-medium text-slate-900 dark:text-white">
          {message.text}
        </p>

        <Button variant="primary" onClick={onDismiss} className="mt-2 w-full">
          Got it
        </Button>
      </div>
    </div>
  );
}
