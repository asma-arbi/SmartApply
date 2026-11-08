// SmartApply Tunisia — Service Worker PWA (Offline First & Cache Strategy)
const CACHE_NAME = "smartapply-cache-v2";
const OFFLINE_URL = "/offline.html";

// Ressources critiques mises en cache à l'installation
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
];

// 1. Installation : mise en cache des assets statiques & page offline
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activation : nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interception des requêtes réseau (Fetch Strategy)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // On ignore les requêtes non-GET et les requêtes externes hors domaine
  if (req.method !== "GET") return;

  // Pour les navigations (pages HTML) : Network First avec Fallback sur Cache ou Page Offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          // Mettre en cache la page visitée pour consultation hors ligne future
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // 1. Tenter de servir la page depuis le cache
          const cachedResponse = await caches.match(req);
          if (cachedResponse) return cachedResponse;

          // 2. Fallback sur la page d'erreur offline officielle
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Pour les images, styles, scripts et icônes : Cache First avec mise à jour en tâche de fond
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // En tâche de fond, rafraîchir le cache si réseau disponible
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Si pas en cache, récupérer via le réseau
      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && req.url.startsWith(self.location.origin)) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Rien à faire pour les assets non trouvés hors ligne
        });
    })
  );
});
