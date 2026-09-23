# 🎾 Tennis & Padel Score

A modern, responsive web app for keeping score during a **tennis or padel**
match. Built to be used courtside: large touch targets, high-contrast
typography, light & dark mode, keyboard shortcuts and a scoring engine that
implements official tennis/padel rules.

![Tech](https://img.shields.io/badge/React-18-61dafb) ![Tech](https://img.shields.io/badge/TypeScript-5-3178c6) ![Tech](https://img.shields.io/badge/Vite-5-646cff) ![Tech](https://img.shields.io/badge/Tailwind-3-38bdf8)

---

## ✨ Features

- **Pick your court** – the landing page is a split screen: choose **Tennis**
  (terracotta **clay court** theme) or **Padel** (green **artificial turf**
  theme). Each half is drawn with the sport's real court markings to scale
  (ITF 23.77 × 10.97 m with singles lines and service boxes, FIP 20 × 10 m with
  its enclosure), turned a quarter turn on phones so they stay legible. The
  choice re-skins the whole app and is remembered; the back arrow on the home
  screen returns to the picker.
- **Play modes** – pick on the home screen:
  - **Singles** *(tennis only)* – a 1 vs 1 match, including the short
    **First to 3** format. Padel is played 2 vs 2, so the card is hidden there.
  - **Doubles** – a single match between two teams of two players.
  - **Tournament** – enter any even number of players (4–16), let the
    **random generator** draw the teams and auto-build a full round-robin
    match plan with live standings, or run a quick **4-team bracket**
    (random openers → winners' Final + 3rd-place match).
- **Play together (online)** – create a shared room, hand the 4-letter code to
  your friends, and everyone scores the **same live match/tournament** from
  their own phone in real time.
- **Match setup** – team & player names, the match format (quick points,
  *First to 3* in singles, best of 3 or 5 sets), Golden Point (No-Ad) and
  Tiebreak toggles, and first-server selection.
- **Official scoring** – `0 → 15 → 30 → 40`, deuce/advantage, Golden Point,
  6-game sets with a two-game lead, 7-point tiebreaks at 6-6, and best-of
  match logic.
- **Serve indicator** – automatically switches after every game and follows
  standard tennis serving rotation during a tiebreak.
- **Swap sides** – a button in the scoring area mirrors the two panels when the
  players change ends, so the on-screen left/right always matches the court.
  It only changes the display (never the score) and is remembered per device.
- **Undo history** – restores the complete previous state (points, games,
  sets, tiebreak, server and winner).
- **Persistence** – the current match *and* the running tournament are saved
  to `localStorage` and survive a page refresh.
- **Winner screen** – celebrates the winning team, disables scoring and offers a
  one-tap **Rematch** (same teams, format and rules, score back at 0) next to
  *Change setup* and *Finish* (back to the home screen).
- **Pre-filled setup** – the setup screen remembers the last match of each mode
  (names, format, rules, first server), so playing again with a small change is
  a matter of seconds.
- **Nice-to-haves** – match duration timer, fullscreen mode, keep-screen-awake
  (Wake Lock API) and keyboard shortcuts.
- **Apple Watch view** – a toggle next to the theme button on the scoreboard
  switches to a compact, watch-optimised layout: a small centred watch frame
  with the two teams stacked as large tap targets, serve dot, score and undo –
  perfect for a wrist-sized screen. The choice is remembered across refreshes.
- **Design** – Apple-inspired, minimalistic, rounded cards, soft shadows,
  smooth animations, light/dark mode and a fully responsive layout. Both sport
  themes are driven by CSS custom properties (`--brand-*`, `--night-*`,
  `--slate-*` in `src/index.css`) that feed Tailwind's colour scales, so the
  `sport-tennis` / `sport-padel` class on `<html>` re-skins every screen.
- **Phone-first** – the layout is tuned for one-handed courtside use: the whole
  scoreboard fits on a phone screen without scrolling, the viewport follows
  `100dvh` (no jumping when the browser's URL bar hides), notches/safe areas are
  respected, pull-to-refresh is disabled while scoring and inputs never trigger
  iOS auto-zoom.

## 🏆 Tournament mode

Playing with a group of friends? Choose **Tournament** on the home screen:

1. Pick the number of players (any even number from 4 to 16).
2. Type in the names.
3. Hit **Draw** to randomly split everyone into teams of two – re-draw as many
   times as you like until the teams look fair.
4. Choose the shared rules (format, Golden Point, tiebreak) and start.

The app generates a **round-robin schedule** (everyone plays everyone once),
spread evenly across rounds. Each fixture is played on the normal scoreboard;
when it finishes you tap **Save result** and return to the overview, where the
**standings** update automatically (wins, set difference, game difference,
points). Once every match is played the **champion** is crowned.

### Bracket format

Prefer a quick knockout? Switch the tournament **Format** to **Bracket**. It
takes exactly **4 teams** (8 players): the two opening matches are drawn at
random, then the **winners meet in the Final** and the **losers play for 3rd
place** — four short matches in total. The Final's winner is the champion.

### Quick "points" format

To keep tournaments short, matches default to a **quick points format**: there
are no sets — the first team to win **2 points wins the match** (a "point" is
one game of `0/15/30/40`), so a match lasts at most 3 points. You can still
switch to **Best of 3** or **Best of 5** sets on the setup screen. The same
three formats are available for a single Doubles match.

## 🎯 Singles mode

Only two players? Choose **Singles** on the home screen. It uses the same
engine and scoreboard as doubles, but each side is a **single player** (one name
per side instead of a team plus two players).

On top of the doubles formats, singles offers **First to 3** — a set-less match
where the first player to win **3 points** takes it (a "point" is one
`0/15/30/40` game), so it lasts at most 5 points. It is preselected for a
singles match; *Quick* (first to 2), *Best of 3* and *Best of 5* remain
available.

## 👥 Play together (online)

Going to the courts with friends and don't want to be the only one holding a
phone? Use the **Play together** panel on the home screen:

1. One person taps **Create a room** and gets a short **4-letter code**.
2. Everyone else opens the same website and enters the code under **Join**.
3. That's it — you're all in the same room. Whoever taps a score button awards
   the point, and the scoreboard updates **live on every device**. Singles and
   doubles matches *and* full tournaments are shared.

No accounts, no sign-up: anyone with the code can score. A small badge in the
corner shows the active room code and a **Leave room** button. Rooms live in
the server's memory and are automatically cleaned up after they go idle.

This needs the small **backend server** (see *Running the server* below). When
you're offline (no server), the app keeps working exactly as before on a single
device.

## 🛠️ Admin panel

There is a hidden **operator console** for whoever runs the server. Open the app
with the `#admin` hash (e.g. `https://your-host/#admin`) to reach it.

**Session overview** — a live list of **all active sessions/rooms**: room code,
mode, connected devices, the live match teams & score (or tournament size) and
when the room was last active.

**Drill into a session** — tap any room to open its detail view, which shows:

- **Devices** — every connected device with a best-effort label (parsed from the
  User-Agent, e.g. "iPhone · Safari"), its IP address and an approximate
  **IP-based location shown on a map** (OpenStreetMap/Leaflet). Devices that
  share one public IP (typical on a court's WiFi) are grouped into one pin.
- **Game settings & score** — team and player names, the chosen rules
  (format, golden point, tiebreak) and the current live score / set history.
- **Tournament** — the standings table and the full bracket/schedule with
  results.

**Send a message** — broadcast a note to everyone in a room. It appears as a
non-blocking **toast** on every device that auto-dismisses after 10 seconds
(handy for "Court 2 is free" or "Last round, please wrap up").

**Device log** — below the session list, a global log of **every device that
has opened the site** — online now *and* recently disconnected — including those
that never joined a room (shown as *"No room"*). Each entry has the device's
best-effort name, IP, approximate location, its current room code (if any) and
an online/last-seen indicator, plus a **map** of all located devices.

> **Note on device data:** browsers cannot expose a real device *name* for
> privacy reasons, so the label is derived from the User-Agent. IP geolocation
> is coarse (city level) and unavailable for private/local addresses; behind a
> reverse proxy the real client IP must be forwarded via `X-Forwarded-For`.

Access is protected by a shared **admin token**:

- Set the `ADMIN_TOKEN` environment variable on the server to enable the panel.
- If `ADMIN_TOKEN` is **not set**, all admin features are disabled and the panel
  refuses to list rooms — so the app never exposes an unauthenticated admin
  surface.
- The token is checked on the server for every admin action and is only kept in
  memory in the browser (never persisted).

With Docker Compose, pass it in via a `.env` file or your shell:

```bash
ADMIN_TOKEN=your-strong-secret docker compose up -d --build
```

## ⌨️ Keyboard shortcuts

| Shortcut          | Action          |
| ----------------- | --------------- |
| `←` (Left Arrow)  | Team A scores   |
| `→` (Right Arrow) | Team B scores   |
| `Ctrl/Cmd + Z`    | Undo last point |

## 🚀 Getting started

Requires **Node.js 18+**.

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build

# Preview the production build
npm run preview
```

## 🖥️ Running the server (online multiplayer)

The **Play together** feature needs a small Node backend (Express + Socket.IO)
that holds the shared room state and syncs everyone in real time. It reuses the
exact same pure game engines as the frontend, so online and offline play behave
identically.

```bash
# Dev: run the backend and the Vite dev server together
npm run dev:all
#   backend  → http://localhost:3001
#   frontend → http://localhost:5173 (talks to the backend automatically)

# Or run just the backend in watch mode
npm run server:dev
```

For **production** the same Node process serves the built app *and* the
WebSocket endpoint — one process, one port:

```bash
npm run build     # build the frontend into dist/
npm start         # serve dist/ + Socket.IO on PORT (default 3001)
```

Deploying on an **OTC Elastic Cloud Server** (or any VM): install Node 18+,
`npm install`, `npm run build`, then run `npm start` behind your reverse proxy
(make sure it forwards WebSocket upgrade headers). Set `PORT` to expose a custom
port. A `GET /healthz` endpoint reports status and the active room count for
load balancers. In development the client picks the backend URL automatically;
override it with the `VITE_SERVER_URL` env var if needed.

### 🐳 Deploy with Docker Compose (OTC)

The easiest way to run it on an OTC Elastic Cloud Server is Docker Compose. The
image builds the frontend and serves it together with the WebSocket backend in
one container.

```bash
# On the server (Docker + Compose plugin installed), from the project root:
docker compose up -d --build

# Check it's healthy / view logs
docker compose ps
docker compose logs -f

# Update after pulling new code
git pull && docker compose up -d --build

# Stop
docker compose down
```

The app is then reachable on **port 80** of the server. Adjust the port mapping
in `docker-compose.yml` (e.g. `"8080:3001"`) if needed, and open the matching
port in the OTC **Security Group**. WebSockets run over the same HTTP port, so
no extra configuration is required.

## 🧪 Testing

The scoring engine is covered by unit tests written with
[Vitest](https://vitest.dev/).

```bash
# Run the test suite once
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run coverage
```

## 🗂️ Project structure

```
padel/
├─ public/
│  └─ padel.svg              # App icon
├─ src/
│  ├─ components/            # React components
│  │  ├─ ui/                 # Reusable primitives (Button, Card, Toggle, TopBar, ...)
│  │  ├─ HomeScreen.tsx      # Mode picker: Singles / Doubles / Tournament
│  │  ├─ SetupScreen.tsx     # Pre-match configuration (singles & doubles)
│  │  ├─ TournamentSetup.tsx # Players, random team draw + rules
│  │  ├─ TournamentScreen.tsx# Standings + round-robin schedule
│  │  ├─ MatchScreen.tsx     # Live scoreboard layout
│  │  ├─ TeamPanel.tsx       # Per-team score column + point button
│  │  ├─ ScoreboardHeader.tsx# Timer + display controls
│  │  ├─ SetHistory.tsx      # Broadcast-style set scoreline
│  │  ├─ ServeIndicator.tsx  # Pulsing "who serves" dot
│  │  ├─ RoomBadge.tsx       # Online room-code badge + leave button
│  │  └─ WinnerOverlay.tsx   # End-of-match celebration
│  ├─ hooks/                 # Custom React hooks
│  │  ├─ useMatch.ts         # Match state + undo history + persistence
│  │  ├─ useTournament.ts    # Tournament state + persistence
│  │  ├─ useRoom.ts          # Online room controller (Socket.IO client)
│  │  ├─ useLocalStorage.ts  # Typed localStorage state
│  │  ├─ useTheme.ts         # Light/dark mode
│  │  ├─ useTimer.ts         # Match duration stopwatch
│  │  ├─ useWakeLock.ts      # Keep the screen awake
│  │  ├─ useFullscreen.ts    # Fullscreen toggle
│  │  └─ useKeyboardShortcuts.ts
│  ├─ lib/
│  │  ├─ scoring.ts          # ⚙️ Pure scoring engine (no UI)
│  │  ├─ tournament.ts       # ⚙️ Pure tournament engine (draw/schedule/standings)
│  │  ├─ roomReducer.ts      # ⚙️ Authoritative shared-room reducer (server + client)
│  │  ├─ format.ts           # Match-format choice → engine settings
│  │  └─ socket.ts           # Socket.IO client singleton
│  ├─ types/
│  │  ├─ match.ts            # Shared match types
│  │  ├─ tournament.ts       # Tournament types
│  │  └─ room.ts             # Shared online room types + socket events
│  ├─ __tests__/
│  │  ├─ scoring.test.ts     # Scoring engine unit tests
│  │  ├─ tournament.test.ts  # Tournament engine unit tests
│  │  ├─ format.test.ts      # Match-format helper unit tests
│  │  └─ roomReducer.test.ts # Shared room reducer unit tests
│  ├─ App.tsx                # Root: wires hooks + screen routing
│  ├─ main.tsx               # Entry point
│  └─ index.css              # Tailwind layers + base styles
├─ server/                   # 🖥️ Multiplayer backend (Express + Socket.IO)
│  ├─ index.ts               # HTTP + WebSocket server, serves dist/
│  ├─ rooms.ts               # In-memory room store + idle cleanup
│  └─ tsconfig.json
├─ index.html
├─ tailwind.config.js
├─ vite.config.ts
└─ package.json
```

## 🧠 Architecture

The **scoring logic is fully separated from the UI**. All rules live in the
pure, framework-agnostic engine at [`src/lib/scoring.ts`](src/lib/scoring.ts):
every function takes an immutable `MatchState` and returns a new one, which
makes the rules trivial to unit-test and lets the UI keep a simple undo stack
of state snapshots.

The React layer is thin: [`useMatch`](src/hooks/useMatch.ts) orchestrates
snapshots, the undo history and `localStorage` persistence, while components
render derived values (point labels, status banners, serve indicator) straight
from the engine.

Tournament mode follows the same pattern: the pure
[`src/lib/tournament.ts`](src/lib/tournament.ts) engine handles the random team
draw (Fisher–Yates shuffle, injectable RNG for tests), round-robin scheduling
and standings maths, while [`useTournament`](src/hooks/useTournament.ts) owns
the persisted tournament state. `App.tsx` bridges the two: it launches each
fixture on the shared scoreboard and folds the finished match back into the
standings.

## 🧾 Scoring rules implemented

- **Points:** `0, 15, 30, 40`.
- **Deuce / Advantage:** at 40-40, a two-point lead wins the game.
- **Golden Point (No-Ad):** when enabled, the next point at deuce wins the game.
- **Sets:** first to 6 games with a two-game lead.
- **Tiebreak:** when enabled, a set tied at 6-6 is decided by a first-to-7
  (two-point lead) tiebreak; otherwise the set continues as an advantage set.
- **Match:** best of 3 → first to 2 sets; best of 5 → first to 3 sets.
- **Quick points format:** no sets — the first team to win 2 games (points)
  wins the match (max 3 points played).

## 📄 License

MIT
