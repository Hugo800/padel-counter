/**
 * `useAdmin` — client-side controller for the hidden admin panel.
 *
 * Wraps the shared Socket.IO connection with two promise-based calls: listing
 * every active room and broadcasting a popup message to one of them. The admin
 * token is never persisted by this hook; the panel keeps it only in memory and
 * passes it back on every call. The server is the sole authority that checks it.
 */

import { useCallback } from 'react';
import { getSocket } from '../lib/socket';
import type {
  AdminDevicesAck,
  AdminListAck,
  AdminMessageAck,
  AdminMessagePayload,
  RoomDetailAck,
} from '../types/room';
import { RoomEvents } from '../types/room';

export interface UseAdmin {
  /** Fetches summaries of all active rooms (requires a valid admin token). */
  listRooms: (token: string) => Promise<AdminListAck>;
  /** Fetches one room's full detail: state + connected devices. */
  getRoom: (code: string, token: string) => Promise<RoomDetailAck>;
  /** Fetches the global device log: everyone who has connected to the site. */
  listDevices: (token: string) => Promise<AdminDevicesAck>;
  /** Sends a popup message to a room (requires a valid admin token). */
  sendMessage: (
    code: string,
    text: string,
    token: string,
  ) => Promise<AdminMessageAck>;
}

export function useAdmin(): UseAdmin {
  const listRooms = useCallback(
    (token: string) =>
      new Promise<AdminListAck>((resolve) => {
        getSocket().emit(RoomEvents.adminList, token, (res: AdminListAck) => {
          resolve(res);
        });
      }),
    [],
  );

  const getRoom = useCallback(
    (code: string, token: string) =>
      new Promise<RoomDetailAck>((resolve) => {
        getSocket().emit(
          RoomEvents.adminRoom,
          { code, token },
          (res: RoomDetailAck) => resolve(res),
        );
      }),
    [],
  );

  const listDevices = useCallback(
    (token: string) =>
      new Promise<AdminDevicesAck>((resolve) => {
        getSocket().emit(
          RoomEvents.adminDevices,
          token,
          (res: AdminDevicesAck) => resolve(res),
        );
      }),
    [],
  );

  const sendMessage = useCallback(
    (code: string, text: string, token: string) =>
      new Promise<AdminMessageAck>((resolve) => {
        const payload: AdminMessagePayload = { code, text, token };
        getSocket().emit(
          RoomEvents.adminMessage,
          payload,
          (res: AdminMessageAck) => resolve(res),
        );
      }),
    [],
  );

  return { listRooms, getRoom, listDevices, sendMessage };
}
