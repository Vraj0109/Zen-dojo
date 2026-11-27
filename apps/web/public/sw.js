// Minimal service worker: caches the offline page, offline reader, and immutable static assets only.
// It never caches API responses or signed-in HTML pages (they are per-user data).
const CACHE = "zd-static-v1";
const OFFLINE = "/offline";
const OFFLINE_READER = "/offline/read";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(new Request(OFFLINE, { credentials: "omit" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "cache-reader") {
    event.waitUntil(
      caches.open(CACHE).then((c) =>
        Promise.all([
          c.add(new Request(OFFLINE, { credentials: "omit" })),
          c.add(new Request(OFFLINE_READER, { credentials: "omit" })),
        ]),
      ),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/whats-new";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Page navigations: network only; on network failure, serve offline reader or offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE);
        const reader = await cache.match(OFFLINE_READER);
        const dsaMatch = url.pathname.match(/^\/dsa\/([^/]+)$/);
        const studyMatch = url.pathname.match(/^\/study\/[^/]+\/([^/]+)$/);

        // If navigating to a problem or lesson and offline reader is cached, redirect to reader at hash
        if (reader && (dsaMatch || studyMatch)) {
          const hash = dsaMatch ? `#problem-${dsaMatch[1]}` : `#lesson-${studyMatch[1]}`;
          return Response.redirect(`${url.origin}/offline/read${hash}`, 302);
        }

        if (reader && url.pathname === OFFLINE_READER) {
          return reader;
        }

        const fallback = await cache.match(OFFLINE);
        return fallback || Response.error();
      }),
    );
    return;
  }

  // Content-hashed build assets and icons: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
