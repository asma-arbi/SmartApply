"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminActionReply } from "../../actions";

interface AdminReplyFormProps {
  ticketId: string;
  currentStatus: string;
}

export default function AdminReplyForm({ ticketId, currentStatus }: AdminReplyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bodyLen, setBodyLen] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!navigator.onLine) {
      setError("Vous êtes hors ligne. Vérifiez votre connexion puis réessayez.");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      try {
        const result = await adminActionReply(ticketId, fd);
        if (result.ok) {
          form.reset();
          setBodyLen(0);
          router.refresh();
        } else {
          setError(result.error ?? "Une erreur est survenue.");
        }
      } catch (err) {
        console.error("[AdminReplyForm] Erreur :", err);
        setError("Erreur inattendue. Réessayez.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="admin-reply-body" className="block text-sm font-medium text-slate-700 mb-1.5">
          Message de réponse
        </label>
        <textarea
          id="admin-reply-body"
          name="body"
          required
          rows={5}
          maxLength={2000}
          placeholder="Votre réponse officielle au ticket…"
          className="input-field resize-y min-h-[100px]"
          onChange={(e) => setBodyLen(e.target.value.length)}
        />
        <p className="text-xs text-slate-400 mt-1 text-right">{bodyLen}/2000</p>
      </div>

      {/* Changer le statut en même temps que la réponse */}
      <div>
        <label htmlFor="admin-status" className="block text-sm font-medium text-slate-700 mb-1.5">
          Mettre à jour le statut (optionnel)
        </label>
        <select
          id="admin-status"
          name="status"
          className="input-field"
          defaultValue=""
        >
          <option value="">— Garder le statut actuel ({currentStatus})</option>
          <option value="en_cours">🟡 En cours</option>
          <option value="resolu">🟢 Résolu — Approuver la réclamation</option>
          <option value="clos">⚫ Clos</option>
        </select>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary min-h-[44px] px-6"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon />
            Envoi en cours…
          </span>
        ) : (
          "Envoyer la réponse"
        )}
      </button>
    </form>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
