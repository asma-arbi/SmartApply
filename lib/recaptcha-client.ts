"use client";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

/**
 * Exécute reCAPTCHA v3 côté client et renvoie le token
 */
export async function executeRecaptcha(action: string): Promise<string> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey || siteKey.startsWith("your_") || siteKey === "dummy_key") {
    return "dev_token_bypass";
  }

  if (typeof window === "undefined" || !window.grecaptcha) {
    return "";
  }

  return new Promise((resolve) => {
    window.grecaptcha?.ready(async () => {
      try {
        const token = await window.grecaptcha!.execute(siteKey, { action });
        resolve(token);
      } catch (err) {
        console.warn("[reCAPTCHA Client] Erreur d'exécution :", err);
        resolve("");
      }
    });
  });
}
