import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SportSelect } from '../components/SportSelect';

/**
 * These assert a *class contract* rather than layout, because jsdom does not
 * compute flexbox. The trap they guard is invisible to the type checker and
 * the linter: growing a half with the `flex-*` shorthand instead of `grow-*`
 * silently resets `flex-basis` too, which made the hovered half shrink to 28%
 * and the divider oscillate under the cursor.
 */
describe('SportSelect court halves', () => {
  const panels = () => [
    screen.getByRole('button', { name: /score a tennis match/i }),
    screen.getByRole('button', { name: /score a padel match/i }),
  ];

  it('grows a half on hover/focus without touching flex-basis', () => {
    render(<SportSelect onSelect={() => {}} />);
    for (const panel of panels()) {
      const cls = panel.className;
      expect(cls).toContain('md:hover:grow-[1.25]');
      expect(cls).toContain('md:focus-visible:grow-[1.25]');
      // The `flex` shorthand would drag flex-basis along with flex-grow.
      expect(cls).not.toMatch(/(hover|focus-visible):flex-\[/);
    }
  });

  it('sizes both halves purely by flex-grow', () => {
    render(<SportSelect onSelect={() => {}} />);
    for (const panel of panels()) {
      // `flex-1` means `flex: 1 1 0%`; any explicit basis would leave no free
      // space for grow to distribute, making the hover effect a no-op.
      expect(panel.className).toContain('flex-1');
      expect(panel.className).not.toMatch(/\bbasis-/);
    }
  });

  it('reports the picked sport', () => {
    const onSelect = vi.fn();
    render(<SportSelect onSelect={onSelect} />);
    panels()[1].click();
    expect(onSelect).toHaveBeenCalledWith('padel');
  });
});
