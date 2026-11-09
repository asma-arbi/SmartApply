"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scheduleInterview } from "@/cv-module/actions/applicationActions";

export type Received = {
  id: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  candidateTitle: string;
  candidateCity: string;
  status: string;
  version: number;
  submittedAt: string | null;
  interview: {
    scheduledAt: string | null;
    durationMinutes: number;
    mode: string;
    location: string;
    note: string;
  } | null;
};

const statusLabels: Record<string, string> = {
  SENT: "Nouvelle candidature",
  PENDING: "En attente",
  SHORTLISTED: "Présélectionnée",
  INTERVIEW: "Entretien planifié",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  WITHDRAWN: "Retirée par le candidat",
};

const modeLabels: Record<string, string> = {
  VISIO: "Visioconférence",
  ONSITE: "Sur site",
  PHONE: "Téléphone",
};

const fmt = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("fr-FR", {
        timeZone: "Africa/Tunis",
        dateStyle: "long",
        timeStyle: "short",
      })
    : "";

export default function ReceivedApplications({ items }: { items: Received[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Aucune candidature reçue pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((a) => {
        const canSchedule = ["SENT", "PENDING", "SHORTLISTED", "INTERVIEW"].includes(a.status);
        return (
          <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-900">
                  <span className="font-semibold">{a.candidateName}</span> a postulé à{" "}
                  <span className="font-semibold">{a.jobTitle}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {[a.candidateTitle, a.candidateCity, a.candidateEmail].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-slate-400">Reçue le {fmt(a.submittedAt)}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  a.status === "INTERVIEW"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {statusLabels[a.status] ?? a.status}
              </span>
            </div>

            {a.interview && (
              <div className="mt-4 rounded-xl bg-emerald-50/60 p-3 text-sm text-slate-700">
                <p className="font-medium">
                  {fmt(a.interview.scheduledAt)} · {a.interview.durationMinutes} min ·{" "}
                  {modeLabels[a.interview.mode] ?? a.interview.mode}
                </p>
                <p className="text-xs text-slate-500">{a.interview.location}</p>
                {a.interview.note && <p className="mt-1 text-xs text-slate-500">{a.interview.note}</p>}
              </div>
            )}

            {canSchedule && openId !== a.id && (
              <button
                onClick={() => setOpenId(a.id)}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {a.interview ? "Replanifier l'entretien" : "Planifier un entretien"}
              </button>
            )}

            {openId === a.id && <ScheduleForm app={a} onClose={() => setOpenId(null)} />}
          </article>
        );
      })}
    </div>
  );
}

export function ScheduleForm({ app, onClose }: { app: Received; onClose: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("45");
  const [mode, setMode] = useState("VISIO");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await scheduleInterview(app.id, {
        version: app.version,
        scheduledAt: new Date(date + ':00+01:00').toISOString(),
        durationMinutes: Number(duration), mode, location, note,
      }, crypto.randomUUID());
      if (!result?.ok) { setError(result?.error?.message || "Impossible de planifier l’entretien. Réessayez."); return; }
      onClose(); router.refresh();
    } catch { setError("Impossible de planifier l’entretien. Réessayez."); }
    finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const now = new Date(Date.now() + 3600000).toISOString().slice(0, 16);

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Date et heure (Africa/Tunis)
          <input
            type="datetime-local"
            required
            min={now}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Durée
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className={field}>
            {[30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          Format
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={field}>
            <option value="VISIO">Visioconférence</option>
            <option value="ONSITE">Sur site</option>
            <option value="PHONE">Téléphone</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          {mode === "VISIO" ? "Lien de la réunion" : mode === "ONSITE" ? "Adresse" : "Numéro à appeler"}
          <input
            required
            maxLength={500}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={field}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Message au candidat (facultatif)
        <textarea
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={field}
        />
      </label>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={busy || !date || !location}
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Confirmer l'entretien"}
        </button>
      </div>
    </form>
  );
}
