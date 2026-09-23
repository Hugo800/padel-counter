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

/**
 * Elapsed seconds of a match whose clock lives somewhere else - in a shared
 * room, so every device in it shows the same duration instead of counting from
 * the moment it happened to join.
 *
 * Ticks only while the match is running; once `endedAt` is set the value is a
 * fixed difference and no interval is kept alive.
 */
export function useSharedDuration(
  startedAt: number | null,
  endedAt: number | null,
): number {
  const elapsed = () => {
    if (startedAt === null) return 0;
    return Math.max(0, Math.floor(((endedAt ?? Date.now()) - startedAt) / 1000));
  };
  const [seconds, setSeconds] = useState(elapsed);

  useEffect(() => {
    setSeconds(elapsed());
    // A finished (or absent) match has a fixed duration - nothing to tick.
    if (startedAt === null || endedAt !== null) return;
    const id = window.setInterval(() => setSeconds(elapsed()), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, endedAt]);

  return seconds;
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
