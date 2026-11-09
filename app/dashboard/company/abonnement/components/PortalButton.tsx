"use client";

import { useTransition } from "react";
import { openPortal } from "../actions";

export default function PortalButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      alert(
        "Vous êtes hors ligne. Reconnectez-vous à Internet pour gérer votre abonnement."
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await openPortal();
        if (result && !result.ok) {
          alert(result.error);
        }
      } catch {
        // redirect() lève une exception Next.js — comportement attendu
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="btn-secondary min-h-[44px] px-5 disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label="Gérer mon abonnement Stripe (facturation, carte, résiliation)"
    >
      {isPending ? (
        <span className="flex items-center gap-2">
          <SpinnerIcon />
          Redirection…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <CreditCardIcon />
          Gérer mon abonnement
        </span>
      )}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
