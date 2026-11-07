/// @ts-nocheck
/* ------------------------------------------------------------------ */
/*  SmartApply — Service Worker (install + offline)                   */
/*  Cache-first assets · Network-first pages/API · offline fallback   */
/* ------------------------------------------------------------------ */

const CACHE_NAME = "smartapply-v2026-05-blue";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/posts",
  "/saved",
  "/groupes",
  "/newsletters",
  "/evenements",
  "/stats",
  "/apply",
  "/company",
  "/login",
  "/pwa",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-192x192.png",
  "/icons/icon-maskable-512x512.png",
];

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      try {
        await cache.add(url);
      } catch (err) {
        console.warn("[SW] Precache skip:", url, err);
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("smartapply-") && key !== CACHE_NAME && key !== "smartapply-pending")
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Next.js chunks and RSC payloads must stay in Next's own cache. Serving a
  // stale module graph from Cache Storage can break hydration and HMR.
  if (url.pathname.startsWith("/_next/")) return;

  // API responses can contain user-specific or frequently changing data.
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/icons/") || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|css)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // In development, serve HTML and route requests directly so layout/CSS
  // changes are immediately visible instead of being masked by an old SW.
  if (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") return;

  event.respondWith(networkFirst(request));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      vibrate: [100, 50, 100],
      data: { dateOfArrival: Date.now(), url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(targetUrl));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Only cache document navigations. In particular, do not cache RSC
    // responses, which may share a URL with the rendered page.
    if (response.ok && request.mode === "navigate") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
      const offlinePage = await caches.match("/offline");
      if (offlinePage) return offlinePage;
      return new Response(
        "<!doctype html><html lang='fr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Hors ligne</title></head><body style='font-family:system-ui;padding:2rem;text-align:center'><h1>SmartApply hors ligne</h1><p>Reconnectez-vous pour continuer.</p><a href='/'>Réessayer</a></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 },
      );
    }

    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-requests") {
    event.waitUntil(replayPendingRequests());
  }
});

async function replayPendingRequests() {
  const cache = await caches.open("smartapply-pending");
  const requests = await cache.keys();
  await Promise.all(
    requests.map(async (req) => {
      try {
        await fetch(req);
        await cache.delete(req);
      } catch {
        // retry later
      }
    }),
  );
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "refresh-feed") {
    event.waitUntil(refreshFeedCache());
  }
});

async function refreshFeedCache() {
  try {
    const response = await fetch("/api/v1/posts?limit=10&page=1");
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put("/api/v1/posts?limit=10&page=1", response);
    }
  } catch {
    // silent
  }
}
