import { useCallback, useEffect, useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { AdminPanel } from './components/AdminPanel';
import { MatchScreen } from './components/MatchScreen';
import { MessageToast } from './components/MessageToast';
import { SetupScreen } from './components/SetupScreen';
import { TournamentScreen } from './components/TournamentScreen';
import { TournamentSetup } from './components/TournamentSetup';
import { useFullscreen } from './hooks/useFullscreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMatch } from './hooks/useMatch';
import { useRoom } from './hooks/useRoom';
import { useSport } from './hooks/useSport';
import { useTheme } from './hooks/useTheme';
import { useSharedDuration, useTimer } from './hooks/useTimer';
import { useTournament } from './hooks/useTournament';
import { useWakeLock } from './hooks/useWakeLock';
import { SportSelect } from './components/SportSelect';
import { buildMatchConfig, resultFromMatchState } from './lib/tournament';
import type { MatchConfig, TeamId } from './types/match';
import type { AppMode } from './types/room';

/**
 * Application root. Owns the cross-cutting UI hooks (sport, theme, timer, wake
 * lock, fullscreen, keyboard) and routes between the sport picker, home,
 * singles, doubles and tournament flows based on the active {@link AppMode}.
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
  const { sport, chooseSport, clearSport } = useSport();
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
  // Mirrors the two team panels when the players change ends. Purely a display
  // preference, so it stays per-device even in a shared online room.
  const [sidesSwapped, setSidesSwapped] = useLocalStorage<boolean>(
    'padel-score:sides-swapped',
    false,
  );
  // The setup of the last match played per mode, so the setup screen can come
  // back pre-filled instead of asking for every name and rule again. Kept per
  // device (and per mode, because singles and doubles use different defaults).
  const [lastConfigs, setLastConfigs] = useLocalStorage<
    Partial<Record<'singles' | 'doubles', MatchConfig>>
  >('padel-score:last-config', {});

  // Hidden admin console, reached via the `#admin` URL hash. Kept out of the
  // normal navigation so regular users never stumble into it.
  const [isAdmin, setIsAdmin] = useState(
    () => window.location.hash === '#admin',
  );
  useEffect(() => {
    const onHashChange = () => setIsAdmin(window.location.hash === '#admin');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const exitAdmin = useCallback(() => {
    // Clearing the hash returns to the normal app (also updates `isAdmin`).
    window.location.hash = '';
  }, []);

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

  // Match duration. Offline it is a local stopwatch driven by the match
  // lifecycle; online it is derived from the room's shared start/end stamps so
  // every phone in the room shows the same time.
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

  const sharedSeconds = useSharedDuration(
    online ? room.state?.matchStartedAt ?? null : null,
    online ? room.state?.matchEndedAt ?? null : null,
  );
  const seconds = online ? sharedSeconds : timer.seconds;

  // Left-to-right order the two teams are drawn in. "Swap sides" mirrors the
  // panels when the players change ends, and the arrow-key shortcuts have to
  // follow it or they would score the team on the opposite side of the screen.
  const [leftTeam, rightTeam]: TeamId[] = sidesSwapped ? ['B', 'A'] : ['A', 'B'];

  // Global keyboard shortcuts (only while a live match is in progress).
  useKeyboardShortcuts(
    {
      onPointLeft: () => activeMatch.awardPointTo(leftTeam),
      onPointRight: () => activeMatch.awardPointTo(rightTeam),
      onUndo: activeMatch.undo,
    },
    matchActive,
  );

  // --- Doubles / singles flow ---------------------------------------------

  const goHome = useCallback(() => setMode('home'), [setMode]);

  /** Back to the sport picker; the home screen is where we return afterwards. */
  const changeSport = useCallback(() => {
    setMode('home');
    clearSport();
  }, [setMode, clearSport]);

  const startSingleMatch = useCallback(
    (config: MatchConfig) => {
      activeMatch.startMatch(config);
      resetTimer();
      // Remember the setup so the next match starts from it instead of an
      // empty form. Only the two single-match modes have a setup screen.
      if (activeMode === 'singles' || activeMode === 'doubles') {
        setLastConfigs((prev) => ({ ...prev, [activeMode]: config }));
      }
    },
    [activeMatch, resetTimer, activeMode, setLastConfigs],
  );

  /**
   * Plays the same match again: identical teams, format, rules and first
   * server, with the score back at 0. Saves re-entering the whole setup, which
   * is what almost everyone wants right after a match.
   */
  const rematch = useCallback(() => {
    activeMatch.resetMatch();
    resetTimer();
  }, [activeMatch, resetTimer]);

  /**
   * Ends the match and returns to the (pre-filled) setup screen of the same
   * mode, so changing a name or the format is a single step away. The setup's
   * back arrow still leads home.
   */
  const endSingleMatch = useCallback(() => {
    activeMatch.newMatch();
    resetTimer();
  }, [activeMatch, resetTimer]);

  /** Stops playing altogether: discards the match and goes back home. */
  const exitToHome = useCallback(() => {
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
    seconds,
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
    sidesSwapped,
    onToggleSides: () => setSidesSwapped((v) => !v),
  };

  // Shared-room code passed inline into each screen so it sits in the normal
  // page flow (bottom of the setup, under the timer during a match) instead of
  // floating over the page. `null` when playing offline, which hides the badge.
  const roomProps = {
    roomCode: online ? room.code : null,
    onLeaveRoom: room.leaveRoom,
  };

  // --- Routing ------------------------------------------------------------

  let content: JSX.Element;

  if (!sport) {
    // Nothing picked yet → the split-screen landing page. Choosing a sport
    // themes the whole app (clay vs. artificial turf) and reveals the modes.
    content = <SportSelect onSelect={chooseSport} />;
  } else if (activeMode === 'tournament') {
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
          {...roomProps}
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
          onSetFirstServer={activeMatch.setFirstServer}
          matchLabel={label}
          {...headerControls}
          {...roomProps}
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
          {...roomProps}
        />
      );
    }
  } else if (activeMode === 'doubles' || activeMode === 'singles') {
    // Both single-match modes share the same screens; only the setup differs.
    // Padel has no 1 vs 1 variant, so a `singles` mode arriving from a shared
    // room falls back to the doubles setup there.
    const singles = activeMode === 'singles' && sport === 'tennis';
    if (!activeMatch.state) {
      content = (
        <SetupScreen
          onStart={startSingleMatch}
          onBack={goHome}
          singles={singles}
          initialConfig={lastConfigs[activeMode]}
          theme={theme}
          onToggleTheme={toggleTheme}
          {...roomProps}
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
          onExit={endSingleMatch}
          exitLabel="New"
          onFinish={endSingleMatch}
          finishLabel="Change setup"
          onRematch={rematch}
          onHome={exitToHome}
          onSetFirstServer={activeMatch.setFirstServer}
          {...headerControls}
          {...roomProps}
        />
      );
    }
  } else {
    // activeMode === 'home'
    content = (
      <HomeScreen
        sport={sport}
        onChangeSport={changeSport}
        onSingles={() => setMode('singles')}
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
      {isAdmin ? (
        <AdminPanel
          theme={theme}
          onToggleTheme={toggleTheme}
          onExit={exitAdmin}
        />
      ) : (
        <>
          {content}
        </>
      )}
      {/* Admin broadcast notification, shown to everyone in a room. */}
      {room.message && (
        <MessageToast message={room.message} onDismiss={room.dismissMessage} />
      )}
    </>
  );
}
