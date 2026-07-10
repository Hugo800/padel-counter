/**
 * Server-side helpers for the admin panel: best-effort IP geolocation and
 * User-Agent parsing.
 *
 * Both are intentionally lightweight and dependency-free. Geolocation results
 * are cached in memory to stay well within the free geolocation API's rate
 * limit, and private/local addresses are never looked up.
 */

import type { GeoLocation } from '../src/types/room';

/** Cached geolocation results keyed by IP (null = looked up, not locatable). */
const geoCache = new Map<string, GeoLocation | null>();

/** Free, key-less IP geolocation endpoint (HTTP only on the free tier). */
const GEO_ENDPOINT = 'http://ip-api.com/json';

/**
 * Normalises the various IP forms Node/Socket.IO can report, e.g. the
 * IPv4-mapped IPv6 prefix (`::ffff:1.2.3.4`) → `1.2.3.4`.
 */
export function normaliseIp(raw: string | undefined): string {
  if (!raw) return '';
  let ip = raw.trim();
  // A forwarded header can carry a comma-separated list; take the first entry.
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice('::ffff:'.length);
  return ip;
}

/** True for loopback / private / link-local addresses that can't be located. */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === '::1' || ip.startsWith('127.') || ip === 'localhost') return true;
  // Private IPv4 ranges (RFC 1918) and link-local.
  if (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.')
  ) {
    return true;
  }
  // 172.16.0.0 – 172.31.255.255
  const m = /^172\.(\d+)\./.exec(ip);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  // Unique-local / link-local IPv6.
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) {
    return true;
  }
  return false;
}

/**
 * Resolves an approximate {@link GeoLocation} for an IP, or null when it is a
 * private address or the lookup fails. Results are cached for the process
 * lifetime so repeated admin refreshes never re-query the same IP.
 */
export async function geolocate(ip: string): Promise<GeoLocation | null> {
  if (isPrivateIp(ip)) return null;
  if (geoCache.has(ip)) return geoCache.get(ip) ?? null;

  try {
    const res = await fetch(
      `${GEO_ENDPOINT}/${encodeURIComponent(ip)}?fields=status,country,regionName,city,lat,lon`,
      { signal: AbortSignal.timeout(4000) },
    );
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
      lat?: number;
      lon?: number;
    };
    if (
      data.status !== 'success' ||
      typeof data.lat !== 'number' ||
      typeof data.lon !== 'number'
    ) {
      geoCache.set(ip, null);
      return null;
    }
    const location: GeoLocation = {
      lat: data.lat,
      lon: data.lon,
      city: data.city ?? null,
      region: data.regionName ?? null,
      country: data.country ?? null,
    };
    geoCache.set(ip, location);
    return location;
  } catch {
    // Network error / timeout: cache the miss so we don't hammer the API.
    geoCache.set(ip, null);
    return null;
  }
}

/**
 * Derives a friendly {device, os, browser} label from a User-Agent string.
 *
 * This is a deliberately small heuristic — enough to tell an iPhone from a
 * Windows laptop in the admin list. A browser cannot expose the real device
 * name, so this is the closest approximation available.
 */
export function parseUserAgent(ua: string | undefined): {
  device: string;
  os: string | null;
  browser: string | null;
} {
  if (!ua) return { device: 'Unknown device', os: null, browser: null };

  // Operating system / device family.
  let os: string | null = null;
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Browser (order matters: Edge/Chrome share tokens).
  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  const device = os
    ? browser
      ? `${os} · ${browser}`
      : os
    : browser ?? 'Unknown device';

  return { device, os, browser };
}
