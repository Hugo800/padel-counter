import type { MatchState } from '../types/match';

interface SetHistoryProps {
  state: MatchState;
}

/**
 * A compact scoreline showing the game count of every completed set plus the
 * set currently in progress, one row per team – like a broadcast scoreboard.
 */
export function SetHistory({ state }: SetHistoryProps) {
  const { completedSets, games, config, winner } = state;

  // Points mode has no sets, so the per-set scoreline is not meaningful.
  if (config.settings.matchType === 'points') return null;

  const showCurrent = !winner; // hide the in-progress column once the match ends

  const columnCount = completedSets.length + (showCurrent ? 1 : 0);
  if (columnCount === 0) return null;

  const rows = (['A', 'B'] as const).map((team) => ({
    team,
    name: config.teams[team].name,
    cells: [
      ...completedSets.map((s) => s[team]),
      ...(showCurrent ? [games[team]] : []),
    ],
  }));

  return (
    <div className="card overflow-x-auto p-3 sm:p-4">
      <table className="w-full text-center">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="py-1 text-left font-semibold">Sets</th>
            {completedSets.map((_, i) => (
              <th key={i} className="w-10 py-1">
                {i + 1}
              </th>
            ))}
            {showCurrent && <th className="w-10 py-1 text-brand-500">Now</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team} className="text-slate-800 dark:text-slate-100">
              <td className="max-w-[6rem] truncate py-1 pr-2 text-left text-sm font-semibold sm:max-w-[8rem] sm:text-base">
                {row.name}
              </td>
              {row.cells.map((value, i) => {
                const isCurrent = showCurrent && i === row.cells.length - 1;
                return (
                  <td
                    key={i}
                    className={`py-1 text-lg font-bold tabular-nums ${
                      isCurrent ? 'text-brand-500' : ''
                    }`}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
