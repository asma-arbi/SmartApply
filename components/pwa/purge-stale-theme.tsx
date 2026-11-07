"use client";

import { useEffect } from "react";

/**
 * One-shot: if the page still paints the old green theme from a cached SW,
 * wipe caches and reload so the blue theme appears.
 */
export function PurgeStaleTheme() {
  useEffect(() => {
    const action = getComputedStyle(document.documentElement)
      .getPropertyValue("--sa-action")
      .trim()
      .toLowerCase();

    const isLegacyGreen =
      action === "#0e8f7a" ||
      action === "#01754f" ||
      action === "#0d9488" ||
      action === "#14b8a6";

    if (!isLegacyGreen) return;

    let cancelled = false;
    (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        window.localStorage.setItem("sa-theme-build", "2026-05-blue");
        if (!cancelled) {
          window.location.replace(`/?fresh=${Date.now()}`);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
