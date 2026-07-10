import { useMemo, useState } from 'react';
import {
  ArrowPathRoundedSquareIcon,
  MinusIcon,
  PlusIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { buildPlayers, shuffle, uid } from '../lib/tournament';
import { settingsFromChoice, type FormatChoice } from '../lib/format';
import type { MatchSettings } from '../types/match';
import type { Theme } from '../hooks/useTheme';
import type { TournamentFormat, TournamentTeam } from '../types/tournament';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { RoomBadge } from './RoomBadge';
import { Toggle } from './ui/Toggle';
import { TopBar } from './ui/TopBar';

interface TournamentSetupProps {
  onCreate: (
    teams: TournamentTeam[],
    settings: MatchSettings,
    format: TournamentFormat,
  ) => void;
  onBack: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  /** Active shared-room code, shown inline when playing online. */
  roomCode?: string | null;
  /** Leaves the current shared room. */
  onLeaveRoom?: () => void;
}

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 16;
/** A bracket is a fixed 4-team knockout, i.e. exactly 8 players. */
const BRACKET_PLAYERS = 8;

/**
 * Splits an array into consecutive pairs, e.g. [0,1,2,3] → [[0,1],[2,3]].
 */
function pairUp<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

/**
 * The tournament configuration screen. The user picks how many players take
 * part, enters their names, tweaks the shared match rules and draws the teams
 * with a random generator (re-drawable until they are happy) before starting.
 */
export function TournamentSetup({
  onCreate,
  onBack,
  theme,
  onToggleTheme,
  roomCode,
  onLeaveRoom,
}: TournamentSetupProps) {
  // Player count is kept even so every player gets a partner.
  const [count, setCount] = useState(4);
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: 4 }, () => ''),
  );
  // Permutation of player indices describing the current random pairing.
  const [pairing, setPairing] = useState<number[]>(() => [0, 1, 2, 3]);

  // How the schedule is built: round-robin (everyone plays everyone) or a
  // 4-team knockout bracket (winners' final + consolation match).
  const [tournamentFormat, setTournamentFormat] =
    useState<TournamentFormat>('round-robin');

  // Default to the quick "points" format so tournaments stay short.
  const [formatChoice, setFormatChoice] = useState<FormatChoice>('points');
  const [goldenPoint, setGoldenPoint] = useState(true);
  const [tiebreakEnabled, setTiebreakEnabled] = useState(true);

  const changeCount = (delta: number) => {
    // Step by two to always keep an even number of players.
    const next = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count + delta * 2));
    applyCount(next);
  };

  /** Resizes the name/pairing arrays to a new (even) player count. */
  const applyCount = (next: number) => {
    setCount(next);
    setNames((prev) => {
      const copy = prev.slice(0, next);
      while (copy.length < next) copy.push('');
      return copy;
    });
    setPairing(Array.from({ length: next }, (_, i) => i));
  };

  /** Switch scheduling format; a bracket forces exactly 8 players (4 teams). */
  const selectTournamentFormat = (next: TournamentFormat) => {
    setTournamentFormat(next);
    if (next === 'bracket' && count !== BRACKET_PLAYERS) {
      applyCount(BRACKET_PLAYERS);
    }
  };

  const setName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  /** Re-draw the random pairing of the current players. */
  const drawTeams = () => {
    setPairing(shuffle(Array.from({ length: count }, (_, i) => i)));
  };

  // Effective player name shown for an index (fallback keeps teams readable).
  const displayName = (index: number) => names[index]?.trim() || `Player ${index + 1}`;

  // Live preview of the teams produced by the current pairing.
  const teamPreview = useMemo(
    () => pairUp(pairing).map((pair) => pair.map(displayName)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairing, names],
  );

  const handleStart = () => {
    // Build players in the drawn order so the teams match the preview exactly,
    // then group them into consecutive pairs.
    const players = buildPlayers(pairing.map(displayName));
    const teams: TournamentTeam[] = pairUp(players).map((pair) => ({
      id: uid('t'),
      name: pair.map((p) => p.name).join(' & '),
      players: pair,
    }));
    const settings: MatchSettings = settingsFromChoice(formatChoice, {
      goldenPoint,
      tiebreakEnabled,
    });
    onCreate(teams, settings, tournamentFormat);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-5 px-4 py-4">
      <TopBar
        title="Tournament"
        onBack={onBack}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {/* Tournament structure */}
      <Card>
        <h2 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Format
        </h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          {tournamentFormat === 'bracket'
            ? 'Two random matches, then winners vs winners and losers vs losers.'
            : 'Every team plays every other team once.'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: 'round-robin',
                title: 'Round Robin',
                subtitle: 'Everyone plays everyone',
              },
              {
                value: 'bracket',
                title: 'Bracket',
                subtitle: '4 teams · knockout',
              },
            ] as { value: TournamentFormat; title: string; subtitle: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => selectTournamentFormat(option.value)}
              className={`flex flex-col items-center rounded-2xl px-4 py-3 text-center font-semibold transition-all
                ${
                  tournamentFormat === option.value
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              <span>{option.title}</span>
              <span
                className={`text-xs font-normal ${
                  tournamentFormat === option.value
                    ? 'text-white/80'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {option.subtitle}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Player count */}
      <Card className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Players
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {count / 2} teams of 2
            {tournamentFormat === 'bracket' && ' · fixed for bracket'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => changeCount(-1)}
            disabled={tournamentFormat === 'bracket' || count <= MIN_PLAYERS}
            aria-label="Fewer players"
          >
            <MinusIcon className="h-5 w-5" />
          </Button>
          <span className="w-8 text-center text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {count}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => changeCount(1)}
            disabled={tournamentFormat === 'bracket' || count >= MAX_PLAYERS}
            aria-label="More players"
          >
            <PlusIcon className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {/* Player names */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Names
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {names.map((name, i) => (
            <input
              key={i}
              aria-label={`Player ${i + 1}`}
              className="w-full rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-slate-900
                placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500
                dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              value={name}
              onChange={(e) => setName(i, e.target.value)}
              placeholder={`Player ${i + 1}`}
            />
          ))}
        </div>
      </Card>

      {/* Rules */}
      <Card className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Rules (apply to every match)
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              { value: 'points', title: 'Quick', subtitle: 'First to 2 points' },
              { value: 'bo3', title: 'Best of 3', subtitle: 'Sets' },
              { value: 'bo5', title: 'Best of 5', subtitle: 'Sets' },
            ] as { value: FormatChoice; title: string; subtitle: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormatChoice(option.value)}
              className={`flex flex-col items-center rounded-2xl px-4 py-3 text-center font-semibold transition-all
                ${
                  formatChoice === option.value
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              <span>{option.title}</span>
              <span
                className={`text-xs font-normal ${
                  formatChoice === option.value
                    ? 'text-white/80'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {option.subtitle}
              </span>
            </button>
          ))}
        </div>
        <Toggle
          id="t-golden-point"
          label="Golden Point (No-Ad)"
          description="Deuce is decided by a single point."
          checked={goldenPoint}
          onChange={setGoldenPoint}
        />
        {/* Tiebreak only applies when sets are played. */}
        {formatChoice !== 'points' && (
          <Toggle
            id="t-tiebreak"
            label="Tiebreak at 6-6"
            checked={tiebreakEnabled}
            onChange={setTiebreakEnabled}
          />
        )}
      </Card>

      {/* Team draw */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Teams
          </h2>
          <Button variant="secondary" size="sm" onClick={drawTeams}>
            <ArrowPathRoundedSquareIcon className="h-5 w-5" />
            Draw
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {teamPreview.map((players, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/15 text-sm font-bold text-brand-600 dark:text-brand-400">
                {i + 1}
              </span>
              <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                {players.join(' & ')}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Button
        variant="primary"
        size="lg"
        onClick={handleStart}
        className="w-full"
      >
        <TrophyIcon className="h-6 w-6" />
        Start tournament
      </Button>

      {/* Inline room code, pinned at the bottom of the settings (only online). */}
      {roomCode && onLeaveRoom && (
        <RoomBadge code={roomCode} onLeave={onLeaveRoom} className="pb-2" />
      )}
    </div>
  );
}
