import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SetupScreen } from '../components/SetupScreen';
import { settingsFromChoice } from '../lib/format';
import type { MatchConfig } from '../types/match';

/** A previous match configuration to pre-fill the setup screen with. */
function configWith(
  choice: Parameters<typeof settingsFromChoice>[0],
  toggles = { goldenPoint: false, tiebreakEnabled: true },
): MatchConfig {
  return {
    teams: {
      A: { name: 'Team A', players: ['', ''] },
      B: { name: 'Team B', players: ['', ''] },
    },
    settings: settingsFromChoice(choice, toggles),
    firstServer: 'A',
  };
}

const BASE_PROPS = {
  onBack: () => {},
  theme: 'light' as const,
  onToggleTheme: () => {},
};

/** The format card that is currently selected, by its title. */
function selectedFormat(): string | null {
  const selected = document.querySelector('.bg-brand-600');
  return selected?.textContent?.trim() ?? null;
}

describe('SetupScreen pre-filling', () => {
  it('keeps the tiebreak enabled after a set-less quick match', () => {
    // A points-mode config always stores `tiebreakEnabled: false` because sets
    // are never played, so seeding the toggle from it used to silently disable
    // the 6-6 tiebreak for the *next* set-based match.
    const onStart = vi.fn();
    render(
      <SetupScreen
        {...BASE_PROPS}
        onStart={onStart}
        initialConfig={configWith('points')}
      />,
    );

    // Switch to a set-based format so the tiebreak applies again.
    fireEvent.click(screen.getByText('Best of 3'));
    fireEvent.click(screen.getByRole('button', { name: /start match/i }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0].settings.tiebreakEnabled).toBe(true);
  });

  it('still honours an explicitly disabled tiebreak from a set match', () => {
    const onStart = vi.fn();
    render(
      <SetupScreen
        {...BASE_PROPS}
        onStart={onStart}
        initialConfig={configWith('bo3', {
          goldenPoint: false,
          tiebreakEnabled: false,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /start match/i }));
    expect(onStart.mock.calls[0][0].settings.tiebreakEnabled).toBe(false);
  });

  it('falls back when the seeded format is not offered in this mode', () => {
    // "First to 3" is singles-only. Seeding a doubles setup with it used to
    // leave the picker with nothing selected while quietly starting it anyway.
    const onStart = vi.fn();
    render(
      <SetupScreen
        {...BASE_PROPS}
        onStart={onStart}
        singles={false}
        initialConfig={configWith('first3')}
      />,
    );

    expect(screen.queryByText('First to 3')).not.toBeInTheDocument();
    expect(selectedFormat()).toContain('Best of 3');

    fireEvent.click(screen.getByRole('button', { name: /start match/i }));
    expect(onStart.mock.calls[0][0].settings.matchType).toBe('sets');
  });

  it('keeps a seeded format that this mode does offer', () => {
    render(
      <SetupScreen
        {...BASE_PROPS}
        onStart={() => {}}
        singles
        initialConfig={configWith('first3')}
      />,
    );
    expect(selectedFormat()).toContain('First to 3');
  });
});
