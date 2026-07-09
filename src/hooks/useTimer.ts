import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A simple elapsed-time stopwatch used for the match duration display.
 * The timer counts up in seconds and can be started, paused and reset.
 *
 * @param autoStart Whether the timer should start immediately.
 */
export function useTimer(autoStart = false) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(autoStart);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [running]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setSeconds(0);
    setRunning(false);
  }, []);

  return { seconds, running, start, pause, reset };
}

/** Formats a number of seconds as `H:MM:SS` or `M:SS`. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
