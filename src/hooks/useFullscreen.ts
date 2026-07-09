import { useCallback, useEffect, useState } from 'react';

/**
 * Toggles browser fullscreen mode and tracks the current state, useful for
 * an unobstructed courtside scoreboard.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  );
  const supported =
    typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!supported) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by the browser – ignore silently.
    }
  }, [supported]);

  return { isFullscreen, toggleFullscreen, supported };
}
