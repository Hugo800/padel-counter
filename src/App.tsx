import { useCallback, useEffect, useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { MatchScreen } from './components/MatchScreen';
import { RoomBadge } from './components/RoomBadge';
import { SetupScreen } from './components/SetupScreen';
import { TournamentScreen } from './components/TournamentScreen';
import { TournamentSetup } from './components/TournamentSetup';
import { useFullscreen } from './hooks/useFullscreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMatch } from './hooks/useMatch';
import { useRoom } from './hooks/useRoom';
import { useTheme } from './hooks/useTheme';
import { useTimer } from './hooks/useTimer';
import { useTournament } from './hooks/useTournament';
import { useWakeLock } from './hooks/useWakeLock';
import { buildMatchConfig, resultFromMatchState } from './lib/tournament';
import type { AppMode } from './types/room';

/**
 * Application root. Owns the cross-cutting UI hooks (theme, timer, wake lock,
 * fullscreen, keyboard) and routes between the home, doubles and tournament
 * flows based on the active {@link AppMode}.
 *
 * The app runs in two interchangeable modes:
 * - **Offline**: state lives in local hooks + localStorage (single device).
 * - **Online**: state lives in a shared server room; the same screens render
 *   the synced room state so several friends can score the same match live.
 *
 * The `active*` values below transparently point at whichever source is in use.
 */
export default function App() {
  const match = useMatch();
  const tournament = useTournament();
  const room = useRoom();
  const { theme, toggleTheme } = useTheme();
  const timer = useTimer();
  const fullscreen = useFullscreen();
  const [keepAwake, setKeepAwake] = useState(false);
  const [localMode, setLocalMode] = useLocalStorage<AppMode>(
    'padel-score:mode',
    'home',
  );
  // Compact Apple-Watch scoreboard layout, remembered across refreshes.
  const [watchMode, setWatchMode] = useLocalStorage<boolean>(
    'padel-score:watch-mode',
    false,
  );

  // Are we currently playing in a shared online room?
  const online = room.online && room.state !== null;

  // Whichever state source is active drives every screen below.
  const activeMatch = online ? room.match : match;
  const activeTournament = online ? room.tournament : tournament;
  const activeMode = online ? room.mode : localMode;
  const setMode = useCallback(
    (m: AppMode) => (online ? room.setMode(m) : setLocalMode(m)),
    [online, room, setLocalMode],
  );

  const hasMatch = activeMatch.state !== null;
  const finished = activeMatch.state?.winner != null;
  const matchActive = hasMatch && !finished;

  // Keep the screen awake only while actively scoring a match.
  const { supported: wakeLockSupported } = useWakeLock(keepAwake && matchActive);

  // Drive the (per-device) duration timer from the match lifecycle.
  const { reset: resetTimer, start: startTimer, pause: pauseTimer } = timer;
  useEffect(() => {
    if (!hasMatch) {
      resetTimer();
    } else if (finished) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [hasMatch, finished, resetTimer, startTimer, pauseTimer]);

  // Global keyboard shortcuts (only while a live match is in progress).
  useKeyboardShortcuts(
    {
      onPointA: () => activeMatch.awardPointTo('A'),
      onPointB: () => activeMatch.awardPointTo('B'),
      onUndo: activeMatch.undo,
    },
    matchActive,
  );

  // --- Doubles flow -------------------------------------------------------

  const goHome = useCallback(() => setMode('home'), [setMode]);

  const startDoublesMatch = useCallback(
    (config: Parameters<typeof match.startMatch>[0]) => {
      activeMatch.startMatch(config);
      resetTimer();
    },
    [activeMatch, resetTimer],
  );

  const endDoubles = useCallback(() => {
    activeMatch.newMatch();
    resetTimer();
    setMode('home');
  }, [activeMatch, resetTimer, setMode]);

  // --- Tournament flow ----------------------------------------------------

  const playTournamentMatch = useCallback(
    (matchId: string) => {
      // Online: the server atomically starts the fixture and opens the board.
      if (online) {
        room.playTournamentMatch(matchId);
        resetTimer();
        return;
      }
      const t = tournament.tournament;
      if (!t) return;
      const fixture = t.matches.find((m) => m.id === matchId);
      if (!fixture) return;
      const teamA = t.teams.find((x) => x.id === fixture.teamAId);
      const teamB = t.teams.find((x) => x.id === fixture.teamBId);
      if (!teamA || !teamB) return;

      tournament.startMatch(matchId);
      match.startMatch(buildMatchConfig(teamA, teamB, t.settings));
      resetTimer();
    },
    [online, room, tournament, match, resetTimer],
  );

  /** Save the finished tournament match and return to the overview. */
  const saveTournamentResult = useCallback(() => {
    if (online) {
      room.saveTournamentResult();
      resetTimer();
      return;
    }
    const t = tournament.tournament;
    if (!t || !t.currentMatchId || !match.state?.winner) return;
    tournament.recordResult(t.currentMatchId, resultFromMatchState(match.state));
    match.newMatch();
    resetTimer();
  }, [online, room, tournament, match, resetTimer]);

  /** Leave a tournament match without recording a result. */
  const exitTournamentMatch = useCallback(() => {
    if (online) {
      room.exitTournamentMatch();
      resetTimer();
      return;
    }
    tournament.clearCurrentMatch();
    match.newMatch();
    resetTimer();
  }, [online, room, tournament, match, resetTimer]);

  const startNewTournament = useCallback(() => {
    if (online) {
      room.startNewTournament();
      resetTimer();
      return;
    }
    tournament.reset();
    match.newMatch();
    resetTimer();
  }, [online, room, tournament, match, resetTimer]);

  // Shared props for the header controls on the match screen.
  const headerControls = {
    seconds: timer.seconds,
    theme,
    onToggleTheme: toggleTheme,
    isFullscreen: fullscreen.isFullscreen,
    onToggleFullscreen: fullscreen.toggleFullscreen,
    fullscreenSupported: fullscreen.supported,
    keepAwake,
    onToggleKeepAwake: () => setKeepAwake((v) => !v),
    wakeLockSupported,
    watchMode,
    onToggleWatch: () => setWatchMode((v) => !v),
  };

  // --- Routing ------------------------------------------------------------

  let content: JSX.Element;

  if (activeMode === 'tournament') {
    const t = activeTournament.tournament;

    if (!t) {
      // No tournament yet → configure one.
      content = (
        <TournamentSetup
          onCreate={(teams, settings, format) =>
            activeTournament.create(teams, settings, format)
          }
          onBack={goHome}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      );
    } else if (t.currentMatchId && activeMatch.state) {
      // A fixture is being played → show the scoreboard.
      const fixture = t.matches.find((m) => m.id === t.currentMatchId);
      const label =
        fixture?.label ??
        (fixture ? `Round ${fixture.round}` : 'Tournament match');
      content = (
        <MatchScreen
          state={activeMatch.state}
          canUndo={activeMatch.canUndo}
          onPointA={() => activeMatch.awardPointTo('A')}
          onPointB={() => activeMatch.awardPointTo('B')}
          onUndo={activeMatch.undo}
          onReset={activeMatch.resetMatch}
          onExit={exitTournamentMatch}
          exitLabel="Back"
          onFinish={saveTournamentResult}
          finishLabel="Save result"
          matchLabel={label}
          {...headerControls}
        />
      );
    } else {
      // Otherwise → tournament overview.
      content = (
        <TournamentScreen
          tournament={t}
          standings={activeTournament.standings}
          isComplete={activeTournament.isComplete}
          winner={activeTournament.winner}
          onPlayMatch={playTournamentMatch}
          onNewTournament={startNewTournament}
          onHome={goHome}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      );
    }
  } else if (activeMode === 'doubles') {
    if (!activeMatch.state) {
      content = (
        <SetupScreen
          onStart={startDoublesMatch}
          onBack={goHome}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      );
    } else {
      content = (
        <MatchScreen
          state={activeMatch.state}
          canUndo={activeMatch.canUndo}
          onPointA={() => activeMatch.awardPointTo('A')}
          onPointB={() => activeMatch.awardPointTo('B')}
          onUndo={activeMatch.undo}
          onReset={activeMatch.resetMatch}
          onExit={endDoubles}
          exitLabel="New"
          onFinish={endDoubles}
          finishLabel="New match"
          {...headerControls}
        />
      );
    }
  } else {
    // activeMode === 'home'
    content = (
      <HomeScreen
        onDoubles={() => setMode('doubles')}
        onTournament={() => setMode('tournament')}
        hasTournament={activeTournament.tournament !== null}
        theme={theme}
        onToggleTheme={toggleTheme}
        online={online}
        connecting={room.status === 'connecting'}
        roomCode={room.code}
        roomError={room.error}
        onCreateRoom={room.createRoom}
        onJoinRoom={room.joinRoom}
        onLeaveRoom={room.leaveRoom}
      />
    );
  }

  return (
    <>
      {content}
      {online && room.code && (
        <RoomBadge code={room.code} onLeave={room.leaveRoom} />
      )}
    </>
  );
}
