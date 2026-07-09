/**
 * Socket.IO client singleton.
 *
 * Establishes (lazily) a single shared connection to the multiplayer backend.
 * In production the app is served by the same Node process, so we connect to
 * the current origin. In development the Vite dev server runs on a different
 * port, so we fall back to the local backend port (overridable via the
 * `VITE_SERVER_URL` environment variable).
 */

import { io, type Socket } from 'socket.io-client';

/** Resolves the backend URL for the current environment. */
function resolveServerUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (configured) return configured;
  // Dev: Vite (5173/5174) → backend on 3001. Prod: same origin as the page.
  if (import.meta.env.DEV) return 'http://localhost:3001';
  return window.location.origin;
}

let socket: Socket | null = null;

/**
 * Returns the shared socket, connecting on first use. The connection is kept
 * open for the lifetime of the page (rooms are joined/left over the same one).
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(resolveServerUrl(), {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
