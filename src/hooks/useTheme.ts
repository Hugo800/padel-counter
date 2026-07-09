import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type Theme = 'light' | 'dark';

/**
 * Manages light/dark mode, persists the choice and reflects it on the
 * `<html>` element via the `dark` class (Tailwind's `darkMode: 'class'`).
 *
 * Defaults to the dark "club" theme to match the Vamos Padel Club look.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useLocalStorage<Theme>(
    'padel-score:theme',
    'dark',
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  return { theme, toggleTheme };
}
