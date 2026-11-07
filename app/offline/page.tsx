import { WifiOff, RefreshCw } from "lucide-react";

/**
 * Fallback hors ligne quand la page n'est pas en cache.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eff5ff] text-[#2563eb]">
        <WifiOff className="h-10 w-10" />
      </div>

      <div className="max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--sa-ink)]">
          Vous êtes hors ligne
        </h1>
        <p className="mt-2 text-sm leading-5 text-[var(--sa-text-secondary)]">
          Cette page n&apos;est pas disponible sans connexion. Les pages déjà
          ouvertes restent accessibles grâce au cache SmartApply.
        </p>
      </div>

      <a
        href="/"
        className="sa-btn-primary inline-flex h-10 items-center gap-2 px-5 text-sm"
      >
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </a>

      <p className="max-w-xs text-xs text-[var(--sa-text-muted)]">
        Installez l&apos;app pour un accès hors ligne plus complet depuis
        l&apos;écran d&apos;accueil.
      </p>
    </div>
  );
}
