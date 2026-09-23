/*
 * Service worker for the Tennis & Padel scoreboard.
 *
 * Written by hand rather than generated, because the caching rules here are
 * short and the consequences of getting them wrong are severe: this app is used
 * on a court with patchy reception, and a stale shell that points at deleted
 * asset hashes would leave a blank screen exactly where nobody can debug it.
 *
 * Three rules, in priority order:
 *   1. Never touch the realtime/API paths - a cached socket handshake or health
 *      probe would break shared rooms in ways that look like a server outage.
 *   2. Navigations go to the network first and fall back to the cached shell,
 *      so a deploy is picked up immediately but the app still opens offline.
 *   3. Build assets are content-hashed and therefore immutable: cache-first.
 */

// Bump to invalidate everything this worker has cached.
const CACHE = 'padel-score-v1';

/** Paths that must always come from the network, never from a cache. */
const NETWORK_ONLY = ['/socket.io/', '/healthz'];

/** The minimum needed to render something useful without a connection. */
const SHELL = ['/', '/manifest.webmanifest', '/padel.svg', '/tennis.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // A single missing entry must not fail the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NETWORK_ONLY.some((path) => url.pathname.startsWith(path))) return;

  // Navigations: fresh if possible, cached shell when the court has no signal.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/').then((r) => r ?? Response.error())),
    );
    return;
  }

  // Everything else (hashed assets, icons, manifest): serve from cache when we
  // have it, otherwise fetch and keep a copy.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Opaque/error responses are not worth storing.
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
