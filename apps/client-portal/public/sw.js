// Client Portal service worker — deliberately lighter than Studio
// Console's: this app has no offline-write queue, because none of the
// brief's offline-supported operations (viewing events/contacts/shot
// lists/equipment checklists, adding notes, completing checklist
// items, saving lead drafts) are client-portal concerns — those are
// all studio-staff workflows. What a client genuinely benefits from
// offline is the same "cached app shell" and "offline fallback" every
// PWA needs, plus receiving push notifications about their own
// bookings/galleries.

const CACHE_VERSION = "client-portal-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL_URLS = ["/", "/offline.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("client-portal-") && key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

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

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Client Portal", body: event.data.text() };
  }
  event.waitUntil(self.registration.showNotification(payload.title || "Client Portal", { body: payload.body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: payload.url ? { url: payload.url } : undefined }));
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

// "Update notification" — same waiting-worker handshake as Studio Console.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
