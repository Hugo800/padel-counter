import { useCallback, useEffect, useRef, useState } from 'react';

// The Screen Wake Lock API is still relatively new; type it minimally so we
// don't depend on lib updates while keeping strong typing at call sites.
interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}
interface WakeLockNavigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

/**
 * Keeps the screen awake during a match using the Screen Wake Lock API,
 * gracefully doing nothing when the browser doesn't support it.
 *
 * @param enabled Whether the wake lock should currently be held.
 */
export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [supported] = useState(
    () => typeof navigator !== 'undefined' && 'wakeLock' in navigator,
  );

  const request = useCallback(async () => {
    if (!supported) return;
    try {
      const nav = navigator as unknown as WakeLockNavigator;
      sentinelRef.current = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      // User denied or the document is not visible – ignore.
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    if (enabled) {
      void request();
    } else if (sentinelRef.current) {
      void sentinelRef.current.release();
      sentinelRef.current = null;
    }

    // Re-acquire the lock when the tab becomes visible again.
    const handleVisibility = () => {
      if (enabled && document.visibilityState === 'visible') {
        void request();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, request, supported]);

  return { supported };
}
