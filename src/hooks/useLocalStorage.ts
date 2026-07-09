import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A typed `useState` that transparently persists its value to
 * `localStorage`, keeping the match alive across page refreshes.
 *
 * @param key    Storage key.
 * @param initial Initial value (or lazy initialiser) used when nothing is stored.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T | (() => T),
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Read once on mount, falling back to the provided initial value.
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // Corrupt or unavailable storage – fall back to the default.
    }
    return initial instanceof Function ? (initial as () => T)() : initial;
  });

  // Persist whenever the value changes.
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // Ignore quota / privacy-mode errors.
    }
  }, [value]);

  /** Removes the persisted value and resets to the initial state. */
  const remove = useCallback(() => {
    try {
      localStorage.removeItem(keyRef.current);
    } catch {
      // Ignore.
    }
    setValue(initial instanceof Function ? (initial as () => T)() : initial);
  }, [initial]);

  return [value, setValue, remove];
}
