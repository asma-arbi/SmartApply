"use client";

import { useOffline } from "next/offline";

/**
 * Fallback Suspense offline-aware.
 * Utiliser comme fallback dans les <Suspense> des pages avec données dynamiques.
 *
 * Exemple :
 *   <Suspense fallback={<ConnectivityFallback label="annonces" />}>
 *     <PostList />
 *   </Suspense>
 */
export function ConnectivityFallback({ label = "contenu" }: { label?: string }) {
  const isOffline = useOffline();

  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {isOffline ? (
        <span>
          📡 Hors ligne — les{" "}
          <span className="font-medium">{label}</span> s'afficheront dès
          le retour de la connexion.
        </span>
      ) : (
        <span>Chargement des {label}…</span>
      )}
    </div>
  );
}
