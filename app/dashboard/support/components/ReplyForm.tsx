"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionAddReply } from "@/app/dashboard/support/actions";

interface ReplyFormProps {
  ticketId: string;
  onReplySent?: () => void;
}

export default function ReplyForm({ ticketId, onReplySent }: ReplyFormProps) {
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
        const result = await actionAddReply(ticketId, fd);
        if (result.ok) {
          form.reset();
          setBodyLen(0);
          router.refresh();
          onReplySent?.();
        } else {
          setError(result.error ?? "Une erreur est survenue.");
        }
      } catch (err) {
        console.error("[ReplyForm] Erreur inattendue :", err);
        setError("Une erreur inattendue est survenue. Réessayez.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      aria-label="Ajouter un message"
    >
      <div>
        <label htmlFor="reply-body" className="sr-only">
          Votre message
        </label>
        <textarea
          id="reply-body"
          name="body"
          required
          rows={4}
          maxLength={2000}
          placeholder="Votre message… (ne partagez pas de mot de passe ni de données bancaires)"
          className="input-field resize-y min-h-[80px]"
          onChange={(e) => setBodyLen(e.target.value.length)}
          aria-describedby="reply-body-hint"
        />
        <p
          id="reply-body-hint"
          className="text-xs text-slate-400 mt-1 text-right"
        >
          {bodyLen}/2000
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary min-h-[44px] px-5"
      >
        {isPending ? (
          <>
            <SpinnerIcon />
            Envoi…
          </>
        ) : (
          "Envoyer le message"
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
