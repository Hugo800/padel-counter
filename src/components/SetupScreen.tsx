import { useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';
import type { MatchConfig, TeamId } from '../types/match';
import { settingsFromChoice, type FormatChoice } from '../lib/format';
import type { Theme } from '../hooks/useTheme';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Toggle } from './ui/Toggle';
import { TopBar } from './ui/TopBar';

interface SetupScreenProps {
  /** Called with the assembled configuration when the match starts. */
  onStart: (config: MatchConfig) => void;
  /** Optional handler for the back button (returns to the home screen). */
  onBack?: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

/** Local form model for a single team. */
interface TeamForm {
  name: string;
  player1: string;
  player2: string;
}

const DEFAULT_A: TeamForm = { name: 'Team A', player1: '', player2: '' };
const DEFAULT_B: TeamForm = { name: 'Team B', player1: '', player2: '' };

/**
 * The pre-match configuration screen. Collects team/player names, the match
 * format and rule toggles, and the first server, then hands a complete
 * {@link MatchConfig} back to the parent.
 */
export function SetupScreen({
  onStart,
  onBack,
  theme,
  onToggleTheme,
}: SetupScreenProps) {
  const [teamA, setTeamA] = useState<TeamForm>(DEFAULT_A);
  const [teamB, setTeamB] = useState<TeamForm>(DEFAULT_B);
  const [formatChoice, setFormatChoice] = useState<FormatChoice>('bo3');
  const [goldenPoint, setGoldenPoint] = useState(false);
  const [tiebreakEnabled, setTiebreakEnabled] = useState(true);
  const [firstServer, setFirstServer] = useState<TeamId>('A');

  const handleStart = () => {
    const config: MatchConfig = {
      teams: {
        A: {
          name: teamA.name.trim() || 'Team A',
          players: [teamA.player1.trim(), teamA.player2.trim()],
        },
        B: {
          name: teamB.name.trim() || 'Team B',
          players: [teamB.player1.trim(), teamB.player2.trim()],
        },
      },
      settings: settingsFromChoice(formatChoice, {
        goldenPoint,
        tiebreakEnabled,
      }),
      firstServer,
    };
    onStart(config);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl animate-fade-in flex-col gap-6 px-4 py-6">
      <TopBar onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} />

      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Padel Score
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Set up your match and start playing.
        </p>
      </header>

      {/* Team names & players */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TeamFields team={teamA} onChange={setTeamA} accent="brand" />
        <TeamFields team={teamB} onChange={setTeamB} accent="rose" />
      </div>

      {/* Match format */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Match format
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
              className={`flex flex-col items-center rounded-2xl px-4 py-4 text-center font-semibold transition-all
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
      </Card>

      {/* Rules */}
      <Card className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Rules
        </h2>
        <Toggle
          id="golden-point"
          label="Golden Point (No-Ad)"
          description="Deuce is decided by a single point."
          checked={goldenPoint}
          onChange={setGoldenPoint}
        />
        {/* Tiebreak only applies when sets are played. */}
        {formatChoice !== 'points' && (
          <Toggle
            id="tiebreak"
            label="Tiebreak at 6-6"
            description="Play a 7-point tiebreak when a set reaches 6-6."
            checked={tiebreakEnabled}
            onChange={setTiebreakEnabled}
          />
        )}
      </Card>

      {/* First server */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
          First server
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {(['A', 'B'] as TeamId[]).map((id) => {
            const name = id === 'A' ? teamA.name : teamB.name;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFirstServer(id)}
                className={`truncate rounded-2xl px-4 py-4 text-center font-semibold transition-all
                  ${
                    firstServer === id
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {name || `Team ${id}`}
              </button>
            );
          })}
        </div>
      </Card>

      <Button
        variant="primary"
        size="lg"
        onClick={handleStart}
        className="w-full"
      >
        <PlayIcon className="h-6 w-6" />
        Start match
      </Button>
    </div>
  );
}

interface TeamFieldsProps {
  team: TeamForm;
  onChange: (team: TeamForm) => void;
  accent: 'brand' | 'rose';
}

/** Grouped inputs for a single team's name and two optional players. */
function TeamFields({ team, onChange, accent }: TeamFieldsProps) {
  const ring =
    accent === 'brand'
      ? 'focus:ring-brand-500'
      : 'focus:ring-rose-500';
  const dot = accent === 'brand' ? 'bg-brand-500' : 'bg-rose-500';

  const inputClass = `w-full rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-slate-900
    placeholder:text-slate-400 focus:outline-none focus:ring-2 ${ring}
    dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${dot}`} />
        <input
          aria-label="Team name"
          className={`${inputClass} text-lg font-semibold`}
          value={team.name}
          onChange={(e) => onChange({ ...team, name: e.target.value })}
          placeholder="Team name"
        />
      </div>
      <input
        aria-label="Player 1"
        className={inputClass}
        value={team.player1}
        onChange={(e) => onChange({ ...team, player1: e.target.value })}
        placeholder="Player 1 (optional)"
      />
      <input
        aria-label="Player 2"
        className={inputClass}
        value={team.player2}
        onChange={(e) => onChange({ ...team, player2: e.target.value })}
        placeholder="Player 2 (optional)"
      />
    </Card>
  );
}
