"use client";

import { useState, useTransition } from "react";
import { getAdvice } from "../actions";

export default function AdvisorCard() {
  const [isPending, startTransition] = useTransition();
  const [advice, setAdvice] = useState<string | null>(null);
  const [fromAi, setFromAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRequest() {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(
        "Vous êtes hors ligne. Reconnectez-vous à Internet pour obtenir un conseil."
      );
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await getAdvice();
        if (result.ok) {
          setAdvice(result.advice);
          setFromAi(result.fromAi);
        } else if (result.error === "quota_exceeded") {
          setError(
            "Vous avez atteint votre quota de conseils IA pour aujourd'hui. Réessayez demain."
          );
        } else {
          setError(
            "Le conseiller IA est temporairement indisponible. Réessayez plus tard."
          );
        }
      } catch {
        setError("Une erreur inattendue est survenue. Réessayez.");
      }
    });
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <SparklesIcon />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            Conseiller de plan IA
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Recevez une recommandation personnalisée basée sur votre usage.
          </p>
        </div>
      </div>

      {/* Résultat */}
      {advice && (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 space-y-2">
          <p className="text-slate-800 text-sm leading-relaxed">{advice}</p>
          {fromAi && (
            <p className="text-indigo-400 text-xs font-medium flex items-center gap-1">
              <SparklesIcon small />
              Généré par IA
            </p>
          )}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleRequest}
        disabled={isPending}
        className="btn-secondary w-full min-h-[44px] text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Demander un conseil personnalisé sur votre plan"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <SpinnerIcon />
            Analyse en cours…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <SparklesIcon />
            {advice ? "Rafraîchir le conseil" : "Obtenir un conseil"}
          </span>
        )}
      </button>
    </div>
  );
}

function SparklesIcon({ small }: { small?: boolean }) {
  return (
    <svg
      className={small ? "w-3 h-3" : "w-5 h-5 text-indigo-500"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" />
    </svg>
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
