import { useEffect, useRef } from 'react';

/**
 * Callbacks invoked by the global match keyboard shortcuts.
 *
 * The two scoring handlers are named after the *screen* side, not the team:
 * the panels can be mirrored with "Swap sides", and an arrow key must always
 * award the point to the team the user sees in that direction.
 */
export interface ShortcutHandlers {
  onPointLeft?: () => void;
  onPointRight?: () => void;
  onUndo?: () => void;
}

/**
 * Registers global keyboard shortcuts for fast courtside scoring:
 * - `ArrowLeft`  → the team shown on the left scores
 * - `ArrowRight` → the team shown on the right scores
 * - `Ctrl/Cmd + Z` → Undo
 *
 * @param handlers Callbacks to run for each shortcut.
 * @param enabled  When false, shortcuts are ignored (e.g. on the setup screen).
 */
export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  enabled = true,
) {
  // Callers pass a fresh object literal every render, so read the handlers
  // through a ref: the listener is then registered once instead of being torn
  // down and re-attached on every single re-render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

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
        handlersRef.current.onUndo?.();
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlersRef.current.onPointLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handlersRef.current.onPointRight?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
