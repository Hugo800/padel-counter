# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- **Admin panel** (hidden `#admin` route): an operator console that lists every
  active session/room in real time — code, mode, connected devices, live match
  teams & score or tournament size, and last-active time. Each session can be
  **opened in detail** to show:
  - **Connected devices** with a best-effort label (parsed from the
    User-Agent), their IP address and an approximate **IP-based location on a
    map** (Leaflet/OpenStreetMap); devices sharing one public IP are clustered.
  - **Game settings & score**: team/player names, rules, live score and set
    history.
  - **Tournament** standings and the full bracket/schedule with results.
- **Admin broadcast** of a message to everyone in a room. It now shows as a
  non-blocking **toast that auto-dismisses after 10 seconds** (previously a
  modal popup). Guarded by a shared `ADMIN_TOKEN`; when it is unset all admin
  features are disabled so no unauthenticated admin surface is exposed.
- **Apple Watch view**: a new toggle next to the theme button on the scoreboard
  switches to a compact, watch-optimised layout — a small centred watch frame
  with both teams stacked as large tap targets, a pulsing serve dot, the current
  score, a compact sets/games summary and an undo button. The preference is
  persisted in `localStorage` (`padel-score:watch-mode`).

### Changed

- **Room-code badge** is now a discreet, fixed chip in the bottom-left corner
  instead of a prominent notification-style banner. Leaving a room is now a
  deliberate two-step action (tap the badge → "Leave room"), so an accidental
  tap can no longer kick you out of the shared room.

## [1.6.0]

### Added

- **Play together (online multiplayer)**: create a shared room, share the short
  4-letter code, and everyone can score the **same live match or tournament**
  from their own device in real time — no accounts, anyone with the code can
  give points.
- New **backend server** (`server/`, Express + Socket.IO) that holds the
  authoritative room state and broadcasts every change to all participants. It
  reuses the exact same pure game engines as the app, so online and offline
  play behave identically. The same Node process also serves the built frontend
  for a single-process deployment (e.g. on an OTC Elastic Cloud Server), plus a
  `GET /healthz` status endpoint and automatic idle-room cleanup.
- Home screen **"Play together"** panel (create / join a room) and a persistent
  **room-code badge** with a *Leave room* button shown on every screen while in
  a room.
- New scripts: `npm start` / `npm run server` (prod server), `npm run server:dev`
  (watch mode) and `npm run dev:all` (backend + Vite dev server together).

### Changed

- The app now transparently switches between local (offline, single-device) and
  online (shared-room) state; all existing screens render either source.

## [1.5.0]

### Changed

- **Clearer serve indicator**: the serving team's whole card is now highlighted
  with a coloured ring and glow in its team accent, and the small pulsing ball
  was replaced by a labelled "Serving" badge that matches the team colour — so
  it's obvious at a glance who is on serve, even from across the court.

## [1.4.0]

### Changed

- **New "club" visual design** inspired by the Vamos Padel Club look: a deep
  padel-green accent (`#17593c`) on near-black, green-tinted surfaces with
  white text and the Open Sans typeface. Dark mode is now the default theme.
- Recoloured the `brand` palette to green, added green-tinted `night` neutrals,
  retinted the shared `slate` neutral scale, and switched the champion banner
  and standings leader highlight to the green accent.

## [1.3.0]

### Added

- **Bracket tournament format**: a 4-team knockout as an alternative to the
  round-robin. The two opening matches are drawn at random, then the winners
  meet in a **Final** (winner vs winner) and the losers play a **3rd place**
  match (loser vs loser) — so the whole tournament is just four short games.
  Selectable via a **Round Robin / Bracket** switch on the tournament setup
  screen (a bracket locks the field to 8 players / 4 teams).
- Engine support: `generateBracket`, `getBracketFinal`, a `format` field on the
  tournament state and automatic slot resolution (winners/losers feed the
  next-round fixtures once decided), all covered by unit tests.

### Changed

- The tournament overview shows fixture labels (Match 1/2, Final, 3rd place),
  "TBD" placeholders and a "Waiting" state for bracket matches whose teams are
  not yet decided; the bracket **champion** is the winner of the Final.

## [1.2.0]

### Added

- **Quick "points" match format**: a short match with no sets where the first
  team to win 2 games (points) wins, so a match lasts at most 3 points. Ideal
  for keeping tournaments short. Selectable alongside Best of 3 / Best of 5 on
  both the Doubles and Tournament setup screens (default for tournaments).
- Scoring-engine support via `matchType`/`pointsToWin` settings plus
  `isPointsMode` / `pointsToWin` helpers, with unit tests.
- Shared `src/lib/format.ts` helper mapping the UI format choice to engine
  settings.

### Changed

- `TeamPanel`, `SetHistory`, `WinnerOverlay` and the tournament standings now
  adapt their layout to points mode (single points tally, no set history,
  points-difference column).

## [1.1.0]

### Added

- **Home screen** with a choice between two play modes: **Doubles** and
  **Tournament**.
- **Tournament mode**:
  - Enter any even number of players (4–16).
  - **Random team generator** (Fisher–Yates shuffle) that splits players into
    teams of two, with a re-drawable preview.
  - Automatic **round-robin match plan** (everyone plays everyone once),
    grouped into rounds.
  - **Live standings** with wins, set difference, game difference and points.
  - Play each fixture on the regular scoreboard and **save the result** back to
    the tournament; the **champion** is crowned once all matches are played.
  - The running tournament is persisted to `localStorage`.
- Pure `src/lib/tournament.ts` engine (team draw, scheduling, standings) with
  a dedicated unit-test suite.
- `useTournament` hook and shared `TopBar` component (back button + theme
  toggle) reused across the setup/home/tournament screens.

### Changed

- `MatchScreen` and `WinnerOverlay` now accept configurable exit/finish
  handlers and labels so the scoreboard can be reused for both doubles and
  tournament matches.
- `App` routing rebuilt around a persisted top-level navigation mode.

## [1.0.0]

### Added

- Initial release: doubles match scoreboard with the full padel/tennis scoring
  engine, undo history, serve indicator, light/dark mode, match timer,
  fullscreen, keep-awake and keyboard shortcuts.
