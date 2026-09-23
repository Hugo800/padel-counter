import { useEffect, useRef, useState } from 'react';

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

  useEffect(() => {
    if (!supported) return;

    // Guards against a request that is still in flight when the effect is torn
    // down (the match ends, the toggle is switched off, the app unmounts).
    let active = true;

    const acquire = async () => {
      // The browser silently releases the lock whenever the tab is hidden, so
      // a sentinel we still hold may already be spent - check before skipping.
      const held = sentinelRef.current;
      if (held && !held.released) return;
      try {
        const nav = navigator as unknown as WakeLockNavigator;
        const sentinel = (await nav.wakeLock?.request('screen')) ?? null;
        if (!active) {
          // Nobody wants this lock any more; releasing it here is the only
          // chance we get, since the cleanup below already ran.
          void sentinel?.release();
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // User denied or the document is not visible - ignore.
      }
    };

    const release = () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) void sentinel.release();
    };

    if (enabled) void acquire();
    else release();

    // Re-acquire the lock when the tab becomes visible again.
    const handleVisibility = () => {
      if (enabled && document.visibilityState === 'visible') {
        void acquire();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      // Never leave the screen pinned awake after the match is over or the
      // component is gone.
      release();
    };
  }, [enabled, supported]);

  return { supported };
}
