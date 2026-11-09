"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionCreateTicket } from "@/app/dashboard/support/actions";

export default function NewTicketForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [subjectLen, setSubjectLen] = useState(0);
  const [descLen, setDescLen] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    // Vérification hors ligne
    if (!navigator.onLine) {
      setError("Vous êtes hors ligne. Vérifiez votre connexion internet puis réessayez.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await actionCreateTicket(fd);
        if (result.ok) {
          router.refresh();
          router.push(`/dashboard/support/${result.ticketId}`);
        } else {
          setError(result.error ?? "Une erreur est survenue. Réessayez.");
        }
      } catch (err) {
        console.error("[NewTicketForm] Erreur inattendue :", err);
        setError("Une erreur inattendue est survenue. Vérifiez votre connexion et réessayez.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card p-6 space-y-5 max-w-2xl mx-auto animate-fade-in"
      aria-label="Formulaire de création de ticket"
    >
      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Sujet <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          minLength={3}
          maxLength={120}
          placeholder="Résumez votre problème en quelques mots"
          className="input-field"
          onChange={(e) => setSubjectLen(e.target.value.length)}
          aria-describedby="subject-hint"
        />
        <p id="subject-hint" className="text-xs text-slate-400 mt-1 text-right">
          {subjectLen}/120
        </p>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Description <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder="Décrivez votre problème en détail. Ne partagez pas de mot de passe ni de données bancaires."
          className="input-field resize-y min-h-[120px]"
          onChange={(e) => setDescLen(e.target.value.length)}
          aria-describedby="desc-hint"
        />
        <p id="desc-hint" className="text-xs text-slate-400 mt-1 text-right">
          {descLen}/2000
        </p>
      </div>

      {/* Info IA */}
      <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
        <span className="text-blue-500 mt-0.5">✨</span>
        <span>
          La catégorie et le niveau d&apos;urgence seront déterminés automatiquement
          par l&apos;IA lors de l&apos;envoi.
        </span>
      </p>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary min-h-[44px] px-6"
        >
          {isPending ? (
            <>
              <SpinnerIcon />
              Envoi en cours…
            </>
          ) : (
            "Envoyer le ticket"
          )}
        </button>
        <a
          href="/dashboard/support"
          className="btn-secondary min-h-[44px] px-5"
        >
          Annuler
        </a>
      </div>
    </form>
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
