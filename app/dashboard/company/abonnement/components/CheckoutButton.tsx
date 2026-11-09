"use client";

import { useTransition } from "react";
import { startCheckout } from "../actions";

interface CheckoutButtonProps {
  disabled?: boolean;
}

export default function CheckoutButton({ disabled }: CheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // Vérification hors-ligne
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      alert(
        "Vous êtes hors ligne. Reconnectez-vous à Internet avant de procéder au paiement."
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await startCheckout();
        // Si startCheckout retourne (au lieu de rediriger), c'est une erreur
        if (result && !result.ok) {
          alert(result.error);
        }
      } catch {
        // redirect() lève une exception Next.js capturée ici — comportement attendu
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || disabled}
      className="btn-primary min-h-[44px] px-6 disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label="Passer au plan Pro avec Stripe"
    >
      {isPending ? (
        <span className="flex items-center gap-2">
          <SpinnerIcon />
          Redirection vers Stripe…
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <BoltIcon />
          Passer au plan Pro
        </span>
      )}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  );
}

function BoltIcon() {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
