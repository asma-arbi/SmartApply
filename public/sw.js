// Only public offline resources may enter Cache Storage. Account HTML, RSC and API
// responses must always use the current session on the network.
const CACHE_NAME = "smartapply-cache-v3";
const OFFLINE_URL = "/offline.html";
const STATIC_ASSETS = ["/manifest.json", OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("smartapply-cache-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // RSC requests can contain the signed-in user's layout even on a public URL.
  if (request.headers.has("RSC") || request.headers.has("Next-Router-Prefetch") || url.searchParams.has("_rsc")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request, {cache: "no-store"}).catch(async () =>
      (await caches.match(OFFLINE_URL)) || new Response("Vous êtes hors ligne.", {status: 503, headers: {"Content-Type": "text/plain; charset=utf-8"}})
    ));
    return;
  }
  // An explicit allowlist prevents new private routes from accidentally being cached.
  if (!STATIC_ASSETS.includes(url.pathname) || url.search) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await (await caches.open(CACHE_NAME)).put(request, response.clone());
    return response;
  })());
});
