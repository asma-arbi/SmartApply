"use client";

import { useOffline } from "next/offline";
import { WifiOff } from "lucide-react";

/**
 * Bandeau global affiché quand l'utilisateur est hors-ligne.
 * Le hook `useOffline` (Next.js 16 expérimental) détecte la connectivité
 * et relance automatiquement les requêtes dès le retour en ligne.
 */
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg"
    >
      <WifiOff className="h-4 w-4" />
      <span>
        Hors ligne — les requêtes seront relancées automatiquement à la
        reconnexion.
      </span>
    </div>
  );
}
