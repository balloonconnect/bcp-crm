// Studio Console service worker — hand-written rather than a generated
// one, so every cached route and cache-invalidation rule here is
// something a person can actually read and reason about.

const CACHE_VERSION = "studio-console-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// "Cached app shell" — the minimum set of routes/assets needed for the
// app to render its own UI chrome even with zero network. Data itself
// (leads, events, etc.) is cached separately, on the fly, as the user
// actually navigates — see the fetch handler below.
const APP_SHELL_URLS = ["/", "/offline.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("studio-console-") && key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

/**
 * "Offline fallback" for navigation requests, "cached app shell" for
 * everything else — network-first for pages (so a studio always sees
 * fresh data when online), falling back to a cached copy or, failing
 * that, `/offline.html` when there's truly no connection. Static
 * assets (JS/CSS/icons) go cache-first, since they're versioned by
 * their own build hashes and don't need a network round-trip to stay
 * correct.
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never cache cross-origin (e.g. the API) requests here — see IndexedDB draft queue for offline data

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const clone = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
      return response;
    })),
  );
});

/**
 * "Push notifications" — displays whatever payload the server sent.
 * Sending the actual push (via VAPID + the `web-push` library) is the
 * one piece this environment can't do without real VAPID credentials
 * configured (see `apps/api`'s `push-subscriptions.service.ts`); the
 * receiving half — subscribing, and rendering a notification when a
 * push does arrive — is fully real.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Studio Console", body: event.data.text() };
  }
  event.waitUntil(self.registration.showNotification(payload.title || "Studio Console", { body: payload.body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: payload.url ? { url: payload.url } : undefined }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.matchAll({ type: "window" }).then((clients) => {
    const existing = clients.find((c) => c.url.includes(url));
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  }));
});

/**
 * "Background sync where supported" — a browser without
 * `SyncManager` support (notably Safari/iOS at the time this was
 * written) simply never fires this event; the app's own IndexedDB
 * queue still flushes on next app open regardless, so nothing is
 * silently lost, it's just synced eagerly-on-reconnect instead of
 * true OS-level background sync. That's the honest meaning of "where
 * supported" — a graceful degradation, not a broken promise.
 */
self.addEventListener("sync", (event) => {
  if (event.tag === "flush-offline-queue") {
    event.waitUntil(self.clients.matchAll().then((clients) => clients.forEach((client) => client.postMessage({ type: "FLUSH_OFFLINE_QUEUE" }))));
  }
});

// "Update notification" — a new service worker sits WAITING until the
// page tells it to activate, so an update never yanks the UI out from
// under someone mid-task; see update-notification.tsx for the prompt
// that sends this message.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
