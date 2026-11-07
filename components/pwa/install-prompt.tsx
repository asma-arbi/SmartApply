"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Share2, Plus, X, WifiOff, MonitorSmartphone } from "lucide-react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa-install";

/**
 * Bouton d'installation PWA — déclenche le dialogue navigateur
 * (télécharger / installer l'app sur l'appareil).
 */
export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [hint, setHint] = useState(false);
  const [toast, setToast] = useState("");

  const syncPrompt = useCallback(() => {
    if (typeof window === "undefined") return;
    setDeferredPrompt(window.__saDeferredInstall ?? null);
  }, []);

  useEffect(() => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone) ||
        window.localStorage.getItem("sa-pwa-installed") === "1",
    );

    // Ne pas masquer longtemps : l'utilisateur veut pouvoir installer
    const dismissedAt = window.localStorage.getItem("sa-install-dismissed");
    if (dismissedAt && Date.now() - Number(dismissedAt) < 60 * 60 * 1000) {
      setDismissed(true);
    }

    syncPrompt();

    const onBip = (e: Event) => {
      const detail = (e as CustomEvent<BeforeInstallPromptEvent>).detail;
      setDeferredPrompt(detail ?? window.__saDeferredInstall ?? null);
      setDismissed(false);
      window.localStorage.removeItem("sa-install-dismissed");
    };
    const onInstalled = () => {
      setIsStandalone(true);
      setToast("SmartApply est installé sur votre appareil.");
    };

    window.addEventListener("sa:beforeinstallprompt", onBip);
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      const bip = event as BeforeInstallPromptEvent;
      window.__saDeferredInstall = bip;
      setDeferredPrompt(bip);
      setDismissed(false);
    });
    window.addEventListener("sa:appinstalled", onInstalled);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          setSwReady(Boolean(reg.active));
          // Re-check installability after SW is controlling the page
          window.setTimeout(syncPrompt, 800);
        })
        .catch(() => setSwReady(false));
    }

    return () => {
      window.removeEventListener("sa:beforeinstallprompt", onBip);
      window.removeEventListener("sa:appinstalled", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [syncPrompt]);

  if (isStandalone || dismissed) return null;

  async function handleInstall() {
    setInstalling(true);
    setToast("");
    try {
      const trigger = window.__saTriggerInstall;
      const outcome = trigger
        ? await trigger()
        : deferredPrompt
          ? await (async () => {
              await deferredPrompt.prompt();
              const choice = await deferredPrompt.userChoice;
              window.__saDeferredInstall = null;
              return choice.outcome;
            })()
          : "unavailable";

      if (outcome === "accepted") {
        setDismissed(true);
        setToast("Téléchargement / installation lancée…");
        return;
      }
      if (outcome === "dismissed") {
        setToast("Installation annulée.");
        return;
      }
      // Navigateur n'a pas encore proposé l'événement → afficher l'aide
      setHint(true);
      setToast("Utilisez le bouton Installer du navigateur (voir ci-dessous).");
    } finally {
      setDeferredPrompt(window.__saDeferredInstall ?? null);
      setInstalling(false);
    }
  }

  function dismiss() {
    setDismissed(true);
    window.localStorage.setItem("sa-install-dismissed", String(Date.now()));
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-md overflow-hidden rounded-2xl border border-[#2563eb]/15 bg-white p-4 shadow-[0_12px_40px_rgba(37,99,235,0.18)] sm:inset-x-auto sm:right-4 sm:left-auto sm:w-96">
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#60a5fa]" />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-[var(--sa-text-muted)] transition-colors hover:bg-[#eff5ff] hover:text-[#2563eb]"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
          <Download className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 pr-4">
          <h3 className="text-sm font-bold tracking-tight text-[var(--sa-ink)]">
            Installer SmartApply
          </h3>
          <p className="mt-0.5 text-xs leading-4 text-[var(--sa-text-secondary)]">
            Téléchargez l&apos;app sur votre PC ou téléphone — accessible hors ligne.
          </p>
          {swReady ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563eb]">
              <WifiOff className="size-3" />
              Mode hors ligne prêt
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--sa-text-muted)]">
              Préparation de l&apos;installation…
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleInstall()}
        disabled={installing}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)] transition-colors hover:bg-[#1d4ed8] disabled:opacity-60"
      >
        <Download className="size-4" />
        {installing
          ? "Installation…"
          : deferredPrompt
            ? "Télécharger l'application"
            : "Installer l'application"}
      </button>

      {toast ? (
        <p className="mt-2 text-center text-[11px] font-medium text-[#2563eb]">{toast}</p>
      ) : null}

      {isIOS ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#eff5ff] px-3 py-2 text-xs text-[var(--sa-text-secondary)]">
          <Share2 className="h-4 w-4 shrink-0 text-[#2563eb]" />
          <span>
            iPhone : <span className="font-semibold text-[#2563eb]">Partager</span> →{" "}
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#2563eb]">
              <Plus className="h-3 w-3" /> Sur l&apos;écran d&apos;accueil
            </span>
          </span>
        </div>
      ) : null}

      {hint || !deferredPrompt ? (
        <div className="mt-3 rounded-xl bg-[#eff5ff] px-3 py-2 text-xs leading-4 text-[var(--sa-text-secondary)]">
          <p className="inline-flex items-center gap-1.5 font-semibold text-[#2563eb]">
            <MonitorSmartphone className="size-3.5" />
            Chrome / Edge sur Windows
          </p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>
              Cliquez l&apos;icône <span className="font-semibold">⊕ / Installer</span> dans la
              barre d&apos;adresse
            </li>
            <li>
              Ou menu <span className="font-semibold">⋮</span> →{" "}
              <span className="font-semibold">Installer SmartApply</span>
            </li>
            <li>L&apos;app s&apos;ajoute au menu Démarrer (pas un fichier .exe)</li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}
