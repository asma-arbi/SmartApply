"use client";

import { useState } from "react";
import { updateCompanyPublicContactsAction } from "@/server/actions/catalog.actions";

export function CompanyPublicContactsEditor({
  companyId,
  websiteUrl,
  contactEmail,
  onSaved,
}: {
  companyId: string;
  websiteUrl: string;
  contactEmail: string;
  onSaved: (value: { websiteUrl: string; contactEmail: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState(websiteUrl);
  const [email, setEmail] = useState(contactEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const updated = await updateCompanyPublicContactsAction(companyId, { websiteUrl: website, contactEmail: email });
      onSaved(updated);
      setWebsite(updated.websiteUrl);
      setEmail(updated.contactEmail);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’enregistrer les coordonnées.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((value) => !value)} className="text-xs font-semibold text-[var(--sa-action)] hover:underline">
        {open ? "Fermer les coordonnées" : "Modifier le site web et l’adresse de contact"}
      </button>
      {open ? (
        <div className="mt-2 grid gap-2 rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[var(--sa-text-secondary)]">Site web
            <input value={website} onChange={(event) => setWebsite(event.target.value)} type="url" placeholder="https://exemple.tn" className="mt-1 h-9 w-full rounded-lg border border-[var(--sa-input-border)] bg-[var(--sa-card)] px-3 text-sm font-normal text-[var(--sa-text)]" />
          </label>
          <label className="text-xs font-semibold text-[var(--sa-text-secondary)]">E-mail de contact
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="recrutement@entreprise.tn" className="mt-1 h-9 w-full rounded-lg border border-[var(--sa-input-border)] bg-[var(--sa-card)] px-3 text-sm font-normal text-[var(--sa-text)]" />
          </label>
          {error ? <p role="alert" className="text-xs text-[var(--sa-danger)] sm:col-span-2">{error}</p> : null}
          <div className="flex justify-end sm:col-span-2"><button type="button" disabled={saving} onClick={() => void save()} className="sa-btn-primary px-4 py-2 text-sm disabled:opacity-60">{saving ? "Enregistrement…" : "Enregistrer"}</button></div>
        </div>
      ) : null}
    </div>
  );
}
