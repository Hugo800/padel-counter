import { useEffect } from 'react';

/** Callbacks invoked by the global match keyboard shortcuts. */
export interface ShortcutHandlers {
  onPointA?: () => void;
  onPointB?: () => void;
  onUndo?: () => void;
}

/**
 * Registers global keyboard shortcuts for fast courtside scoring:
 * - `ArrowLeft`  → Team A scores
 * - `ArrowRight` → Team B scores
 * - `Ctrl/Cmd + Z` → Undo
 *
 * @param handlers Callbacks to run for each shortcut.
 * @param enabled  When false, shortcuts are ignored (e.g. on the setup screen).
 */
export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts while typing in inputs / editable fields.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handlers.onUndo?.();
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlers.onPointA?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handlers.onPointB?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}
