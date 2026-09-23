import { useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';
import type { MatchConfig, TeamId } from '../types/match';
import {
  choiceFromSettings,
  isPointsChoice,
  settingsFromChoice,
  type FormatChoice,
} from '../lib/format';
import { TEAM_ACCENT, type TeamAccent } from '../lib/teamAccent';
import type { Theme } from '../hooks/useTheme';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { RoomBadge } from './RoomBadge';
import { Toggle } from './ui/Toggle';
import { TopBar } from './ui/TopBar';

interface SetupScreenProps {
  /** Called with the assembled configuration when the match starts. */
  onStart: (config: MatchConfig) => void;
  /** Optional handler for the back button (returns to the home screen). */
  onBack?: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  /** Active shared-room code, shown inline when playing online. */
  roomCode?: string | null;
  /** Leaves the current shared room. */
  onLeaveRoom?: () => void;
  /**
   * Renders the 1 vs 1 variant: a single player name per side and the extra
   * short "First to 3" format. Defaults to the doubles (2 vs 2) setup.
   */
  singles?: boolean;
  /**
   * The previous match's configuration. Every field is pre-filled from it so
   * playing again against the same opponents needs no re-typing – only what
   * actually changed. Undefined on the very first match.
   */
  initialConfig?: MatchConfig;
}

/** Local form model for a single team. */
interface TeamForm {
  name: string;
  player1: string;
  player2: string;
}

const DEFAULT_A: TeamForm = { name: 'Team A', player1: '', player2: '' };
const DEFAULT_B: TeamForm = { name: 'Team B', player1: '', player2: '' };
const SINGLES_A: TeamForm = { name: 'Player 1', player1: '', player2: '' };
const SINGLES_B: TeamForm = { name: 'Player 2', player1: '', player2: '' };

/** Format options offered for a doubles match. */
const DOUBLES_FORMATS: { value: FormatChoice; title: string; subtitle: string }[] =
  [
    { value: 'points', title: 'Quick', subtitle: 'First to 2 points' },
    { value: 'bo3', title: 'Best of 3', subtitle: 'Sets' },
    { value: 'bo5', title: 'Best of 5', subtitle: 'Sets' },
  ];

/** Singles adds the short "First to 3" format on top of the doubles options. */
const SINGLES_FORMATS: { value: FormatChoice; title: string; subtitle: string }[] =
  [
    { value: 'points', title: 'Quick', subtitle: 'First to 2 points' },
    { value: 'first3', title: 'First to 3', subtitle: 'Points' },
    { value: 'bo3', title: 'Best of 3', subtitle: 'Sets' },
    { value: 'bo5', title: 'Best of 5', subtitle: 'Sets' },
  ];

/**
 * Seeds one team's form fields from a previous match configuration, falling
 * back to the mode's placeholder names when there is none.
 */
function teamFormFrom(
  config: MatchConfig | undefined,
  id: TeamId,
  singles: boolean,
): TeamForm {
  const fallback = singles
    ? id === 'A'
      ? SINGLES_A
      : SINGLES_B
    : id === 'A'
      ? DEFAULT_A
      : DEFAULT_B;
  if (!config) return fallback;
  const team = config.teams[id];
  return {
    name: team.name,
    player1: team.players[0] ?? '',
    player2: team.players[1] ?? '',
  };
}

/**
 * The pre-match configuration screen. Collects team/player names, the match
 * format and rule toggles, and the first server, then hands a complete
 * {@link MatchConfig} back to the parent.
 *
 * The same screen serves both play modes: in {@link SetupScreenProps.singles}
 * mode each side is a single player and the extra "First to 3" format appears.
 *
 * When an {@link SetupScreenProps.initialConfig} is passed it seeds every
 * field, so the usual "same players, one more match" case is a single tap.
 */
export function SetupScreen({
  onStart,
  onBack,
  theme,
  onToggleTheme,
  roomCode,
  onLeaveRoom,
  singles = false,
  initialConfig,
}: SetupScreenProps) {
  // Everything below is seeded from the previous match when there was one, and
  // falls back to the mode's defaults otherwise.
  const [teamA, setTeamA] = useState<TeamForm>(() =>
    teamFormFrom(initialConfig, 'A', singles),
  );
  const [teamB, setTeamB] = useState<TeamForm>(() =>
    teamFormFrom(initialConfig, 'B', singles),
  );
  const formats = singles ? SINGLES_FORMATS : DOUBLES_FORMATS;

  // Singles defaults to the short "First to 3"; doubles keeps best-of-3 sets.
  const [formatChoice, setFormatChoice] = useState<FormatChoice>(() => {
    const fallback: FormatChoice = singles ? 'first3' : 'bo3';
    if (!initialConfig) return fallback;
    const seeded = choiceFromSettings(initialConfig.settings);
    // The previous match may have used a format this mode does not offer (the
    // singles-only "First to 3" seeding a doubles setup), which would leave the
    // picker with nothing selected while quietly starting the hidden format.
    return formats.some((f) => f.value === seeded) ? seeded : fallback;
  });
  const [goldenPoint, setGoldenPoint] = useState(
    initialConfig?.settings.goldenPoint ?? false,
  );
  const [tiebreakEnabled, setTiebreakEnabled] = useState(
    // A points-mode config always stores `tiebreakEnabled: false` (there are no
    // sets to tie), so seeding from it would silently turn the 6-6 tiebreak off
    // for the next set-based match — via a toggle that was never even shown.
    initialConfig && initialConfig.settings.matchType !== 'points'
      ? initialConfig.settings.tiebreakEnabled
      : true,
  );
  const [firstServer, setFirstServer] = useState<TeamId>(
    initialConfig?.firstServer ?? 'A',
  );
  const fallbackName = (id: TeamId) =>
    singles ? (id === 'A' ? 'Player 1' : 'Player 2') : `Team ${id}`;

  const handleStart = () => {
    const config: MatchConfig = {
      teams: {
        A: {
          name: teamA.name.trim() || fallbackName('A'),
          // In singles only the first player slot is used; the second stays
          // empty so the scoreboard renders a single name.
          players: [teamA.player1.trim(), singles ? '' : teamA.player2.trim()],
        },
        B: {
          name: teamB.name.trim() || fallbackName('B'),
          players: [teamB.player1.trim(), singles ? '' : teamB.player2.trim()],
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
    <div className="mx-auto flex min-h-full w-full max-w-2xl animate-fade-in flex-col gap-4 px-4 py-5 sm:gap-6 sm:py-6">
      <TopBar onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} />

      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {singles ? 'Singles' : 'Doubles'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          {singles
            ? '1 vs 1 – set up your match and start playing.'
            : 'Set up your match and start playing.'}
        </p>
      </header>

      {/* Team names & players */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <TeamFields
          team={teamA}
          onChange={setTeamA}
          accent="a"
          singles={singles}
        />
        <TeamFields
          team={teamB}
          onChange={setTeamB}
          accent="b"
          singles={singles}
        />
      </div>

      {/* Match format */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Match format
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {formats.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFormatChoice(option.value)}
              className={`flex flex-col items-center rounded-2xl px-3 py-3 text-center text-sm font-semibold transition-all sm:px-4 sm:py-4 sm:text-base
                ${
                  formatChoice === option.value
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              <span>{option.title}</span>
              <span
                className={`text-[11px] font-normal sm:text-xs ${
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
        {!isPointsChoice(formatChoice) && (
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
                {name || fallbackName(id)}
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

      {/* Inline room code, pinned at the bottom of the settings (only online). */}
      {roomCode && onLeaveRoom && (
        <RoomBadge code={roomCode} onLeave={onLeaveRoom} className="pb-2" />
      )}
    </div>
  );
}

interface TeamFieldsProps {
  team: TeamForm;
  onChange: (team: TeamForm) => void;
  accent: TeamAccent;
  /** Hides the second player slot (1 vs 1). */
  singles?: boolean;
}

/** Grouped inputs for a single team's name and its optional player(s). */
function TeamFields({ team, onChange, accent, singles = false }: TeamFieldsProps) {
  const { focusRing: ring, dot } = TEAM_ACCENT[accent];

  const inputClass = `w-full rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-base text-slate-900
    placeholder:text-slate-400 focus:outline-none focus:ring-2 ${ring}
    dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-3 w-3 shrink-0 rounded-full ${dot}`} />
        <input
          aria-label={singles ? 'Player name' : 'Team name'}
          className={`${inputClass} text-lg font-semibold`}
          value={team.name}
          onChange={(e) => onChange({ ...team, name: e.target.value })}
          placeholder={singles ? 'Player name' : 'Team name'}
        />
      </div>
      {/* In singles the display name above is the player, so the extra player
          slots are only useful (and shown) for doubles. */}
      {!singles && (
        <>
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
        </>
      )}
    </Card>
  );
}
