/* ------------------------------------------------------------------ */
/*  Client instrumentation — Service Worker + PWA offline             */
/* ------------------------------------------------------------------ */

import { captureInstallPrompt } from "./lib/pwa-install";

const THEME_BUILD = "2026-05-blue";

// Capture install event ASAP (before React mounts)
captureInstallPrompt();

async function purgeLegacyCaches() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(
        (key) =>
          key.startsWith("smartapply-") &&
          !key.includes(THEME_BUILD) &&
          key !== "smartapply-pending",
      )
      .map((key) => caches.delete(key)),
  );
}

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const last = window.localStorage.getItem("sa-theme-build");
      if (last !== THEME_BUILD) {
        await purgeLegacyCaches();
        window.localStorage.setItem("sa-theme-build", THEME_BUILD);
      }

      const reg = await navigator.serviceWorker.register(
        new URL("./lib/service-worker.js", import.meta.url),
        { scope: "/", updateViaCache: "none" },
      );

      console.log("[SW] Service Worker enregistré, scope :", reg.scope);

      // Force update check so installability + offline stay fresh
      void reg.update();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            console.log("[SW] Mise à jour disponible.");
          }
        });
      });

      if ("periodicSync" in reg) {
        try {
          await (reg as any).periodicSync.register("refresh-feed", {
            minInterval: 60 * 60 * 1000,
          });
        } catch {
          // unsupported
        }
      }
    } catch (err) {
      console.warn("[SW] Échec enregistrement Service Worker :", err);
    }
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
