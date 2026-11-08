"use client";

import { useState, useEffect } from "react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Vérifier l'état initial
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      // Masquer la notification de reconnexion après 3 secondes
      setTimeout(() => setWasOffline(false), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[92%] sm:w-auto max-w-md animate-slide-up pointer-events-none"
    >
      {isOffline ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/95 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-amber-500/25 backdrop-blur-md border border-amber-400">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
          <span className="truncate">
            Mode Hors Ligne PWA — Navigation sur données en cache local
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/95 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-emerald-600/25 backdrop-blur-md border border-emerald-500">
          <span>✓</span>
          <span>Connexion Internet rétablie</span>
        </div>
      )}
    </div>
  );
}
