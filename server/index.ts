/**
 * Padel Score multiplayer backend.
 *
 * A single Node process that:
 *   1. serves the built React app (the `dist/` folder) as static files, and
 *   2. exposes a Socket.IO endpoint so several people can score the same
 *      match/tournament together in real time.
 *
 * The server is the single authority: clients send {@link RoomAction}s and it
 * broadcasts the resulting {@link RoomState} to everyone in the room. All game
 * logic is reused from the shared pure engines in `src/lib`.
 *
 * Designed to run as one process (e.g. on an OTC Elastic Cloud Server):
 * `npm run build` then `npm start`.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import {
  applyAction,
  createRoom,
  getRoom,
  listRoomSummaries,
  roomCount,
  startCleanup,
} from './rooms';
import { RoomEvents } from '../src/types/room';
import type {
  AdminListAck,
  AdminMessageAck,
  AdminMessagePayload,
  CreateRoomAck,
  DeviceInfo,
  JoinRoomAck,
  RoomAction,
  RoomDetailAck,
} from '../src/types/room';
import { geolocate, normaliseIp, parseUserAgent } from './geo';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT) || 3001;

/**
 * Shared secret that guards the admin panel. When unset, all admin features
 * are disabled so the app never exposes an unauthenticated admin surface.
 */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() || null;
/** Maximum length of an admin broadcast message (defensive input bound). */
const MAX_MESSAGE_LENGTH = 280;

/**
 * Validates an admin token in constant-ish time. Returns false whenever admin
 * mode is disabled (no `ADMIN_TOKEN` configured) or the token does not match.
 */
function isAdmin(token: unknown): boolean {
  return (
    ADMIN_TOKEN !== null &&
    typeof token === 'string' &&
    token === ADMIN_TOKEN
  );
}

const app = express();
const httpServer = createServer(app);

// Allow any origin for the WebSocket handshake. In production the app is
// served from the same origin; in dev the Vite server (a different port)
// needs cross-origin access.
const io = new Server(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});

/** Connection-scoped metadata about one client socket (for the admin panel). */
interface DeviceMeta {
  ip: string;
  userAgent: string | undefined;
  /** Room the socket currently belongs to, or null when in no room. */
  code: string | null;
  connectedAt: number;
}

/** Live metadata for every connected socket, keyed by socket id. */
const devices = new Map<string, DeviceMeta>();

// --- Static frontend ------------------------------------------------------
// Serve the built SPA. Unknown non-API routes fall back to index.html so the
// client-side app can handle routing/deep links.
app.use(express.static(DIST_DIR));

/** Simple health/status endpoint (handy for load balancers on OTC). */
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', rooms: roomCount() });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// --- Realtime rooms -------------------------------------------------------
io.on('connection', (socket) => {
  // The room this particular socket currently belongs to (one at a time).
  let currentCode: string | null = null;

  // Capture the client's IP + User-Agent for the admin panel. Behind a reverse
  // proxy or Docker port mapping the real client IP arrives via the
  // `x-forwarded-for` header, so prefer it and fall back to the socket address.
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const ip = normaliseIp(
    (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
      socket.handshake.address,
  );
  devices.set(socket.id, {
    ip,
    userAgent: socket.handshake.headers['user-agent'],
    code: null,
    connectedAt: Date.now(),
  });

  /** Joins the socket to a room's broadcast channel. */
  const join = (code: string) => {
    if (currentCode) socket.leave(currentCode);
    currentCode = code;
    socket.join(code);
    const meta = devices.get(socket.id);
    if (meta) meta.code = code;
  };

  // Create a fresh room and immediately join it.
  socket.on(RoomEvents.create, (ack?: (res: CreateRoomAck) => void) => {
    const room = createRoom();
    join(room.code);
    ack?.({ code: room.code, state: room.state });
  });

  // Join an existing room by code.
  socket.on(
    RoomEvents.join,
    (code: unknown, ack?: (res: JoinRoomAck) => void) => {
      if (typeof code !== 'string' || !code.trim()) {
        ack?.({ ok: false, error: 'Invalid room code.' });
        return;
      }
      const room = getRoom(code);
      if (!room) {
        ack?.({ ok: false, error: 'Room not found.' });
        return;
      }
      join(room.code);
      ack?.({ ok: true, state: room.state });
    },
  );

  // Apply a game action and broadcast the new state to the whole room.
  socket.on(RoomEvents.action, (action: RoomAction) => {
    if (!currentCode) return;
    const state = applyAction(currentCode, action);
    if (state) io.to(currentCode).emit(RoomEvents.state, state);
  });

  socket.on(RoomEvents.leave, () => {
    if (currentCode) socket.leave(currentCode);
    currentCode = null;
    const meta = devices.get(socket.id);
    if (meta) meta.code = null;
  });

  // Forget the device metadata once the socket goes away.
  socket.on('disconnect', () => {
    devices.delete(socket.id);
  });

  // --- Admin panel --------------------------------------------------------
  // List every active room. Requires a valid admin token; the connected-client
  // count per room is read from the Socket.IO adapter.
  socket.on(
    RoomEvents.adminList,
    (token: unknown, ack?: (res: AdminListAck) => void) => {
      if (!isAdmin(token)) {
        ack?.({
          ok: false,
          error: ADMIN_TOKEN
            ? 'Invalid admin token.'
            : 'Admin panel is disabled (set ADMIN_TOKEN on the server).',
        });
        return;
      }
      const rooms = listRoomSummaries().map((room) => ({
        ...room,
        clients: io.sockets.adapter.rooms.get(room.code)?.size ?? 0,
      }));
      ack?.({ ok: true, rooms });
    },
  );

  // Return the full detail for one room: its state plus every connected device
  // (with a best-effort IP geolocation for the map).
  socket.on(
    RoomEvents.adminRoom,
    async (
      payload: { code?: unknown; token?: unknown },
      ack?: (res: RoomDetailAck) => void,
    ) => {
      if (!isAdmin(payload?.token)) {
        ack?.({ ok: false, error: 'Not authorised.' });
        return;
      }
      const room =
        typeof payload?.code === 'string' ? getRoom(payload.code) : undefined;
      if (!room) {
        ack?.({ ok: false, error: 'Room not found.' });
        return;
      }

      // Collect the sockets currently in the room and resolve their devices.
      const socketIds = [
        ...(io.sockets.adapter.rooms.get(room.code) ?? []),
      ];
      const deviceList = await Promise.all(
        socketIds.map(async (id): Promise<DeviceInfo | null> => {
          const meta = devices.get(id);
          if (!meta) return null;
          const ua = parseUserAgent(meta.userAgent);
          return {
            id,
            ip: meta.ip || 'unknown',
            device: ua.device,
            os: ua.os,
            browser: ua.browser,
            location: await geolocate(meta.ip),
            connectedAt: meta.connectedAt,
          };
        }),
      );

      ack?.({
        ok: true,
        state: room.state,
        devices: deviceList.filter((d): d is DeviceInfo => d !== null),
      });
    },
  );

  // Broadcast a popup message to everyone in a specific room.
  socket.on(
    RoomEvents.adminMessage,
    (
      payload: AdminMessagePayload,
      ack?: (res: AdminMessageAck) => void,
    ) => {
      if (!isAdmin(payload?.token)) {
        ack?.({ ok: false, error: 'Not authorised.' });
        return;
      }
      const text =
        typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!text) {
        ack?.({ ok: false, error: 'Message must not be empty.' });
        return;
      }
      if (text.length > MAX_MESSAGE_LENGTH) {
        ack?.({ ok: false, error: 'Message is too long.' });
        return;
      }
      const room =
        typeof payload?.code === 'string' ? getRoom(payload.code) : undefined;
      if (!room) {
        ack?.({ ok: false, error: 'Room not found.' });
        return;
      }
      io.to(room.code).emit(RoomEvents.message, { text, at: Date.now() });
      ack?.({ ok: true });
    },
  );
});

startCleanup();

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Padel Score server listening on http://localhost:${PORT}`);
});
