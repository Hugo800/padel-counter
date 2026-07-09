/**
 * In-memory store of active multiplayer rooms.
 *
 * Rooms are ephemeral: they live only in the server's memory and are cleaned
 * up after a period of inactivity. This is intentional — a padel session is
 * short-lived and there is no need for a database. If the process restarts,
 * players simply create a fresh room.
 */

import { initialRoomState, roomReducer } from '../src/lib/roomReducer';
import type { RoomAction, RoomState } from '../src/types/room';

/** A single active room. */
interface Room {
  code: string;
  state: RoomState;
  /** Epoch ms of the last mutation, used for idle cleanup. */
  updatedAt: number;
}

/** Characters used for room codes (no ambiguous 0/O/1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

/** Rooms untouched for longer than this are dropped (6 hours). */
const IDLE_TTL_MS = 6 * 60 * 60 * 1000;
/** How often the idle-cleanup sweep runs (30 minutes). */
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

const rooms = new Map<string, Room>();

/** Generates a short, human-friendly, currently-unused room code. */
function generateCode(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  // Extremely unlikely fallback: extend length until unique.
  let code = generateCode() + CODE_ALPHABET[0];
  while (rooms.has(code)) code += CODE_ALPHABET[0];
  return code;
}

/** Creates a new empty room and returns it. */
export function createRoom(): Room {
  const code = generateCode();
  const room: Room = {
    code,
    state: initialRoomState(),
    updatedAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

/** Looks up a room by (case-insensitive) code. */
export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

/**
 * Applies an action to a room via the shared authoritative reducer and
 * returns the new state, or undefined when the room does not exist.
 */
export function applyAction(
  code: string,
  action: RoomAction,
): RoomState | undefined {
  const room = rooms.get(code.toUpperCase());
  if (!room) return undefined;
  room.state = roomReducer(room.state, action);
  room.updatedAt = Date.now();
  return room.state;
}

/** Periodically removes rooms that have been idle for too long. */
export function startCleanup(): NodeJS.Timeout {
  const timer = setInterval(() => {
    const cutoff = Date.now() - IDLE_TTL_MS;
    for (const [code, room] of rooms) {
      if (room.updatedAt < cutoff) rooms.delete(code);
    }
  }, CLEANUP_INTERVAL_MS);
  // Do not keep the process alive solely for the cleanup timer.
  timer.unref?.();
  return timer;
}

/** Current number of active rooms (used by the health endpoint). */
export function roomCount(): number {
  return rooms.size;
}
