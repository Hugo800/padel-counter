import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MatchScreen } from '../components/MatchScreen';
import { awardPoint, createInitialState } from '../lib/scoring';
import { settingsFromChoice } from '../lib/format';
import type { MatchConfig, MatchState } from '../types/match';

const CONFIG: MatchConfig = {
  teams: {
    A: { name: 'Anna & Ben', players: ['Anna', 'Ben'] },
    B: { name: 'Cara & Dan', players: ['Cara', 'Dan'] },
  },
  settings: settingsFromChoice('bo3', {
    goldenPoint: false,
    tiebreakEnabled: true,
  }),
  firstServer: 'A',
};

const CONTROLS = {
  seconds: 0,
  theme: 'light' as const,
  onToggleTheme: () => {},
  isFullscreen: false,
  onToggleFullscreen: () => {},
  fullscreenSupported: true,
  keepAwake: false,
  onToggleKeepAwake: () => {},
  wakeLockSupported: true,
  watchMode: false,
  onToggleWatch: () => {},
};

function renderScreen(state: MatchState, overrides = {}) {
  const props = {
    state,
    canUndo: false,
    onPointA: vi.fn(),
    onPointB: vi.fn(),
    onUndo: vi.fn(),
    onReset: vi.fn(),
    onExit: vi.fn(),
    ...CONTROLS,
    ...overrides,
  };
  render(<MatchScreen {...props} />);
  return props;
}

describe('MatchScreen on a phone', () => {
  it('scores from anywhere in the team column, not just the bar', () => {
    const props = renderScreen(createInitialState(CONFIG));
    // The whole column is one button, so the team name is part of the target.
    const column = screen.getByRole('button', { name: /point for anna & ben/i });
    expect(
      within(column).getByRole('heading', { name: 'Anna & Ben' }),
    ).toBeInTheDocument();

    fireEvent.click(column);
    expect(props.onPointA).toHaveBeenCalledTimes(1);
    expect(props.onPointB).not.toHaveBeenCalled();
  });

  it('needs two taps to throw the score away', () => {
    const props = renderScreen(createInitialState(CONFIG));
    const reset = screen.getByRole('button', { name: /restart/i });

    fireEvent.click(reset);
    expect(props.onReset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /sure/i }));
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it('speaks the score for screen readers', () => {
    let state = createInitialState(CONFIG);
    state = awardPoint(state, 'A');
    state = awardPoint(state, 'B');
    renderScreen(state);

    const live = screen.getByRole('status');
    expect(live).toHaveTextContent('Anna & Ben 15');
    expect(live).toHaveTextContent('Cara & Dan 15');
    expect(live).toHaveTextContent(/serving: anna & ben/i);
  });

  it('offers the serve correction only before the first point', () => {
    const onSetFirstServer = vi.fn();
    const { unmount } = render(
      <MatchScreen
        state={createInitialState(CONFIG)}
        canUndo={false}
        onPointA={() => {}}
        onPointB={() => {}}
        onUndo={() => {}}
        onReset={() => {}}
        onExit={() => {}}
        onSetFirstServer={onSetFirstServer}
        {...CONTROLS}
      />,
    );
    expect(screen.getByText('Serve')).toBeInTheDocument();
    unmount();

    renderScreen(awardPoint(createInitialState(CONFIG), 'A'), {
      onSetFirstServer,
    });
    expect(screen.queryByText('Serve')).not.toBeInTheDocument();
  });

  it('asks for a change of ends after the first game', () => {
    let state = createInitialState(CONFIG);
    for (let i = 0; i < 4; i++) state = awardPoint(state, 'A'); // 1-0
    const onToggleSides = vi.fn();
    renderScreen(state, { onToggleSides });

    const button = screen.getByRole('button', { name: /change ends/i });
    fireEvent.click(button);
    expect(onToggleSides).toHaveBeenCalledTimes(1);
    // Acted on: it goes back to the quiet label instead of nagging.
    expect(screen.queryByRole('button', { name: /change ends/i })).toBeNull();
    expect(screen.getByRole('button', { name: /swap sides/i })).toBeInTheDocument();
  });
});
