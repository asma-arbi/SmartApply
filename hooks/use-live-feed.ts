"use client";

import { useEffect, useRef } from "react";

/**
 * Soft live refresh: focus / visibility only.
 * Keep the live-feed fingerprint inexpensive to avoid unnecessary DB work.
 */
export function useLiveFeed(onInvalidate: () => void, enabled = true) {
  const cb = useRef(onInvalidate);
  cb.current = onInvalidate;
  const lastRun = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const run = () => {
      const now = Date.now();
      if (now - lastRun.current < 8_000) return;
      lastRun.current = now;
      cb.current();
    };

    const onFocus = () => run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
