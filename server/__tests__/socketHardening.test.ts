// @vitest-environment node
/**
 * A malformed Socket.IO message must never take the server down. Every handler
 * used to call `ack?.()` – which throws for a non-function ack – and the
 * reducer read `action.type` on whatever arrived. One such message from any
 * client ended the process, and with it every in-memory room.
 *
 * The server runs in this test process, so a crash surfaces as an uncaught
 * exception or unhandled rejection, which fails the Vitest run on its own.
 */
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { RoomEvents } from '../../src/types/room';

const TOKEN = 'test-admin-token';
let base = '';
let close: () => Promise<void> = async () => {};

beforeAll(async () => {
  process.env.ADMIN_TOKEN = TOKEN;
  process.env.PORT = String(40000 + Math.floor(Math.random() * 20000));
  const server = await import('../index');
  if (!server.httpServer.listening) {
    await new Promise((resolve) => server.httpServer.once('listening', resolve));
  }
  base = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;
  close = () => new Promise((resolve) => server.io.close(() => resolve()));
});

afterAll(() => close());

const clients: Socket[] = [];
afterAll(() => clients.forEach((c) => c.close()));

async function client(): Promise<Socket> {
  const socket = connect(base, { transports: ['websocket'], reconnection: false });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
  return socket;
}

/** Gives the server time to process fire-and-forget messages (and to crash). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

interface Health {
  status: string;
  rooms: number;
  roomClients: number;
}

async function healthz(): Promise<Health> {
  return (await (await fetch(`${base}/healthz`)).json()) as Health;
}

const JUNK: unknown[][] = [
  [],
  [{}],
  [42],
  [null],
  ['ABCD', {}],
  [{}, 'not a function'],
  [{ token: TOKEN }, 7],
  [{ token: TOKEN, code: { nested: true }, text: 42 }, []],
  [TOKEN, { not: 'a function' }],
];

describe('socket hardening', () => {
  it('survives every client event with malformed arguments', async () => {
    const socket = await client();
    const events = [
      RoomEvents.create,
      RoomEvents.join,
      RoomEvents.action,
      RoomEvents.leave,
      RoomEvents.adminList,
      RoomEvents.adminRoom,
      RoomEvents.adminDevices,
      RoomEvents.adminMessage,
    ];
    for (const event of events) {
      for (const args of JUNK) socket.emit(event, ...args);
    }
    await settle();
    expect(socket.connected).toBe(true);
    expect((await healthz()).status).toBe('ok');
  });

  it('survives malformed actions inside a room and keeps the room usable', async () => {
    const socket = await client();
    const code = await new Promise<string>((resolve) =>
      socket.emit(RoomEvents.create, (res: { code: string }) => resolve(res.code)),
    );
    for (const action of [null, 42, 'match/point', {}, { type: 7 }, { type: 'match/start' }, { type: 'match/point', team: 'Z' }]) {
      socket.emit(RoomEvents.action, action);
    }
    await settle();
    expect(socket.connected).toBe(true);

    // The room still answers a well-formed join from a second device.
    const other = await client();
    const joined = await new Promise<{ ok: boolean }>((resolve) =>
      other.emit(RoomEvents.join, code, resolve),
    );
    expect(joined.ok).toBe(true);
    expect((await healthz()).roomClients).toBeGreaterThanOrEqual(2);
  });

  it('ignores a non-function ack instead of throwing (no handler error at all)', async () => {
    // The crash-proof wrapper would swallow a throw as well; this checks the
    // ack handling itself, so a regression is not hidden behind the wrapper.
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const socket = await client();
      socket.emit(RoomEvents.create, {});
      socket.emit(RoomEvents.join, 'ABCD', { not: 'a function' });
      socket.emit(RoomEvents.adminList, TOKEN, 5);
      socket.emit(RoomEvents.adminDevices, TOKEN, 'x');
      socket.emit(RoomEvents.adminRoom, { token: TOKEN, code: 'ZZZZ' }, {});
      socket.emit(RoomEvents.adminMessage, { token: TOKEN, text: 'hi', code: 'ZZZZ' }, []);
      await settle();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it('still answers well-formed admin requests', async () => {
    const socket = await client();
    const res = await new Promise<{ ok: boolean }>((resolve) =>
      socket.emit(RoomEvents.adminList, TOKEN, resolve),
    );
    expect(res.ok).toBe(true);
  });
});
