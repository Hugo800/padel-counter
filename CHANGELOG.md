# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- **Installable and offline-capable (PWA)**: a web app manifest plus a
  hand-written service worker (`public/sw.js`) make the scoreboard installable
  on a phone's home screen and usable without a signal — the common case on a
  court. Navigations are network-first with a cached shell as fallback, so a
  deploy is picked up immediately; the content-hashed build assets are served
  cache-first. The realtime paths (`/socket.io/`, `/healthz`) are never cached,
  because a stale handshake would break shared rooms in ways that look like a
  server outage. Registered only in production builds.
- **Landscape layout for phones** (`short:` breakpoint, `max-height: 520px` and
  landscape): a phone laid sideways on the bench now gives all of its height to
  the score. Set history, player names and the shortcut hint step aside, the
  header, cards and buttons tighten up.
- **Change-of-ends prompt**: the app now knows when the rules call for a change
  of ends — after every odd game of a set, and every six points of a tiebreak —
  and turns the *Swap sides* control into a highlighted *Change ends* for that
  moment. New pure `isChangeOfEndsDue()` in the scoring engine, fully tested;
  it only ever fires between points, and stops asking once acted on.
- **Serve correction**: the first server can be fixed from the scoreboard until
  the first point is played. The logic already existed in the hook, the reducer
  and as a `match/firstServer` room action, but was unreachable from the UI.
  The shared rule now lives in `canChooseFirstServer()` instead of being
  duplicated three times.
- **Spoken score**: a visually-hidden live region announces the score, games,
  sets and who is serving, so VoiceOver and TalkBack users hear changes instead
  of facing a silent board.

### Changed

- **Team B has its own sport-aware colour** (`teamb`, driven by CSS variables
  like the rest of the palette). Team B previously kept Tailwind's default rose
  in both sports, which sat far too close to tennis' terracotta — the two teams
  measured only dE 36 apart, against dE 101 on padel's green. Tennis now pairs
  the clay with a cool blue (dE 114) and padel with a deeper crimson. As a side
  effect the big *+ Point* button finally passes WCAG contrast: white on the
  old rose was 3.67:1, the new colours give 6.3:1 (padel) and 6.7:1 (tennis).
  `rose` stays reserved for genuinely destructive actions.
- **The whole team column scores a point**, not just the bar at its foot —
  roughly double the tap target on the device this app is actually used on. The
  bar remains as the visual affordance.
- **Games are the prominent number** after the point itself; sets ride along in
  a smaller chip.
- **Reset is now a two-step *Restart***: the first tap arms it, the second
  clears the score, and it disarms itself after four seconds. It previously sat
  one stray thumb away from wiping a match, at the same visual weight as *Undo*.
- **The match clock is shared in online rooms**: `matchStartedAt` /
  `matchEndedAt` live in the room state, so every phone shows the same duration
  instead of counting from the moment it happened to join. Offline play keeps
  its local stopwatch.
- **Browser chrome and icon follow the chosen sport**: the `theme-color` meta
  and the favicon switch between clay and turf, applied before the first paint
  so the status bar never flashes the wrong sport's colour.
- **Pinch-zoom is no longer blocked**. `maximum-scale=1.0, user-scalable=no`
  failed WCAG 1.4.4; the reason it is usually set (iOS zooming into sub-16px
  inputs) is already covered by the 16px input rule.
- **The sport picker keeps its contrast on hover**. The darkening wash used to
  lighten from 25% to 10%, dropping the white label from 8.0:1 to 6.2:1 exactly
  when someone was reading it. The court markings now carry the hover and touch
  feedback instead.

- **Rematch**: the winner overlay now offers **Rematch** as its primary action.
  It replays the match with the exact same teams, format, rules and first
  server, with the score back at 0 — no more retyping the whole setup just to
  play another round. The second button (*Change setup*) leads to the setup
  screen for the cases where something actually changed, and a third quiet
  *Finish* ends the session and returns to the home screen. Tournament fixtures
  are unaffected: there the primary action stays *Save result*.
- **Home button** in the match control bar (next to *Undo*, *Reset* and *New*),
  so a match can be abandoned and the home screen reached in one tap instead of
  a detour via the setup screen. It is hidden during tournament fixtures, where
  *Back* already leads to the overview.
- **Pre-filled setup**: the setup screen remembers the last match of each mode
  (`padel-score:last-config`, per device) and seeds every field from it — team
  and player names, format, Golden Point, tiebreak and first server. New
  `choiceFromSettings()` helper in `src/lib/format.ts` recovers the UI format
  choice from stored settings, covered by round-trip tests.
- **Sport selection (Tennis vs. Padel)**: first-time visitors land on a
  full-bleed **split screen** and pick the sport they want to score. Each half
  previews its playing surface — a **terracotta clay court** for tennis and the
  typical **green artificial turf** for padel — with true-to-scale court
  markings drawn as SVG: the tennis half shows the ITF court (23.77 × 10.97 m,
  singles sidelines, service lines 6.40 m from the net, centre marks, net posts
  0.91 m outside the doubles lines), the padel half the FIP court (20 × 10 m,
  enclosure, service lines 6.95 m from the back wall, centre service line and no
  singles lines). The court turns a quarter turn on phones so it stays large in
  the stacked layout. Each half grows on hover/focus. The layout stacks
  vertically on phones and sits side-by-side from the `md` breakpoint up. The
  choice is persisted
  (`padel-score:sport`) and re-applied before the first paint via a small inline
  script in `index.html`, so returning users never see the wrong palette flash.
  The back arrow on the home screen returns to the picker.
- **Sport-specific theming**: the Tailwind `brand`, `night` and `slate` scales
  now resolve through CSS custom properties (`--brand-600` etc., defined in
  `src/index.css`) instead of fixed hex values. Toggling the `sport-tennis` /
  `sport-padel` class on `<html>` re-skins the *entire* app — home, setup,
  scoreboard, tournament and admin — without touching a single utility class.
  Light and dark mode keep working on top of both palettes.
- **Sport-specific play modes**: **Singles is now a tennis-only mode** and was
  removed from the padel home screen (padel is played 2 vs 2). Tennis offers
  *Singles*, *Doubles* and *Tournament*; padel offers *Doubles* and
  *Tournament*. A `'singles'` mode arriving from a shared room falls back to the
  doubles setup while padel is selected.
- **Singles mode (1 vs 1)**: a third card on the home screen next to *Doubles*
  and *Tournament*. The setup screen adapts to a single player name per side and
  the scoreboard, undo, tournament-free flow and online rooms work exactly as in
  doubles. Adds the `'singles'` value to the shared `AppMode`, so a room's mode
  is synced (and shown in the admin panel) like every other mode.
- **"First to 3" match format** in Singles: a short set-less match where the
  first player to win **3 points wins** (a "point" is one `0/15/30/40` game), so
  it lasts at most 5 points. It is the default format for a singles match.
- **Swap sides**: a *Swap sides* button in the scoring area mirrors the two team
  panels when the players change ends, so the on-screen left/right always
  matches the court. It is a pure display preference — scores, serve and history
  are untouched — and is persisted per device
  (`padel-score:sides-swapped`). The Apple-Watch layout gained the same control.
- Unit tests for the format helper (`src/__tests__/format.test.ts`), including
  an end-to-end *First to 3* match.
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
- **Admin device log**: a global log of **every device that has opened the
  site** — online now and recently disconnected — including those that never
  joined a room (marked *"No room"*). Each entry shows the device's best-effort
  name, IP, approximate IP-based location, its current room code (if any) and an
  online/last-seen indicator, plus a **map of all located devices**. The server
  retains disconnected devices for up to 24 hours (capped) so the overview also
  covers **sessions without a room code**.
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

- **Ending a single match returns to the setup screen** of the same mode instead
  of all the way to the home screen. Together with the pre-filled fields, tweaking
  a name or the format before the next match is now a single step; the setup's
  back arrow still leads home.
- **Mobile optimisation** across the app:
  - Viewport height now follows `100dvh`, so the scoreboard no longer jumps when
    the mobile browser's URL bar hides; safe-area padding uses `border-box` and
    the app shell scrolls inside it.
  - Pull-to-refresh / rubber-band scrolling is disabled (`overscroll-behavior`)
    and inputs are pinned to 16px so iOS stops zooming in on focus.
  - Tighter paddings, smaller headings and responsive score typography on the
    match screen, team panels, set history and header, so a full scoreboard fits
    on a phone without scrolling.
  - Home-screen mode cards render as compact rows on phones (icon beside the
    text) and as cards from `sm` upwards; the format picker uses a two-column
    grid on small screens.
- **Room-code badge** is now a discreet chip that sits **inline in the page
  flow** instead of a floating overlay, so it no longer moves along when you
  scroll. It appears where it fits naturally: at the bottom of the match/tournament
  setup and just under the match timer during play (and under the tournament
  header). It is styled in the same **padel green as the round pill** and carries
  a **pulsing "live" dot** to show the room is connected and syncing in real time.
  Leaving a room is still a deliberate two-step action (tap the badge →
  "Leave room"), so an accidental tap can no longer kick you out of the shared
  room.

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
