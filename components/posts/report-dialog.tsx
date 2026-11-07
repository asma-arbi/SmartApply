"use client";

import { useState } from "react";
import { REPORT_REASONS } from "@/lib/constants";
import type { ReportReason } from "@/types/post";
import { cn } from "@/lib/utils";

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: ReportReason, details: string) => void;
  title?: string;
  description?: string;
};

const DETAILS_MAX = 2000;

export function ReportDialog({ open, onOpenChange, onSubmit, title = "Signaler le post", description = "Pourquoi signalez-vous ce post ?" }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function submit() {
    const text = details.trim();
    if (reason === "OTHER" && text.length < 8) {
      setError("Précisez le motif (8 caractères minimum).");
      return;
    }
    onSubmit(reason, text);
    setDetails("");
    setError("");
    setReason("SPAM");
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-[var(--sa-modal-backdrop)]"
        onClick={() => onOpenChange(false)}
      />
      <div className="sa-modal relative z-10 w-full max-w-md overflow-hidden">
        <div className="border-b border-[var(--sa-divider)] px-4 py-3">
          <h2 className="text-[18px] font-semibold text-[var(--sa-text)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--sa-text-secondary)]">
            {description}
          </p>
        </div>
        <div className="space-y-1 px-2 py-2">
          {REPORT_REASONS.filter((item) => item.value !== "COPYRIGHT").map((item) => (
            <label
              key={item.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-[var(--sa-hover)]",
                reason === item.value && "bg-[var(--sa-action-soft)]",
              )}
            >
              <input
                type="radio"
                name="report-reason"
                checked={reason === item.value}
                onChange={() => {
                  setReason(item.value);
                  setError("");
                }}
                className="size-4 accent-[var(--sa-action)]"
              />
              <span className="font-medium text-[var(--sa-text)]">{item.label}</span>
            </label>
          ))}
        </div>
        <div className="px-4 pb-3">
          <label className="block text-[12px] font-semibold text-[var(--sa-text-secondary)]">
            Détails (optionnel)
            <textarea
              value={details}
              maxLength={DETAILS_MAX}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-[8px] border border-[var(--sa-input-border)] bg-[var(--sa-card)] px-3 py-2 text-sm text-[var(--sa-text)] outline-none focus:border-[var(--sa-action)]"
              placeholder="Ajoutez un contexte pour la modération…"
            />
          </label>
          {error ? <p className="mt-1 text-xs text-[var(--sa-danger)]">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--sa-divider)] px-4 py-3">
          <button
            type="button"
            className="sa-btn-action px-4 py-2 text-sm font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </button>
          <button type="button" className="sa-btn-primary px-4 py-2" onClick={submit}>
            Envoyer le signalement
          </button>
        </div>
      </div>
    </div>
  );
}
