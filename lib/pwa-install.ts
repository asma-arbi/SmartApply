/**
 * Capture early `beforeinstallprompt` so the Install button can trigger
 * the real browser install dialog (download / add app).
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __saDeferredInstall?: BeforeInstallPromptEvent | null;
    __saTriggerInstall?: () => Promise<"accepted" | "dismissed" | "unavailable">;
  }
}

export function captureInstallPrompt() {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    const bip = event as BeforeInstallPromptEvent;
    window.__saDeferredInstall = bip;
    window.dispatchEvent(new CustomEvent("sa:beforeinstallprompt", { detail: bip }));
  });

  window.addEventListener("appinstalled", () => {
    window.__saDeferredInstall = null;
    window.localStorage.setItem("sa-pwa-installed", "1");
    window.dispatchEvent(new Event("sa:appinstalled"));
  });

  window.__saTriggerInstall = async () => {
    const bip = window.__saDeferredInstall;
    if (!bip) return "unavailable";
    await bip.prompt();
    const { outcome } = await bip.userChoice;
    window.__saDeferredInstall = null;
    return outcome;
  };
}

export function canPromptInstall() {
  return Boolean(typeof window !== "undefined" && window.__saDeferredInstall);
}
