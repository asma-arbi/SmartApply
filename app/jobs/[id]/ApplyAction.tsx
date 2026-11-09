"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, type Application, type Cv } from "@/cv-module/components/api";

type Props = {
  jobId: string;
  companyId: string;
  jobTitle: string;
  viewerRole: string | null;
  closed: boolean;
};

const base = "inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold";

export default function ApplyAction({ jobId, companyId, jobTitle, viewerRole, closed }: Props) {
  const router = useRouter();
  const key = useRef(crypto.randomUUID());
  const [applied, setApplied] = useState(false);
  const [open, setOpen] = useState(false);
  const [cvs, setCvs] = useState<Cv[] | null>(null);
  const [cvId, setCvId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (viewerRole !== "candidat") return;
    api<Application[]>("applications")
      .then((list) => setApplied(list.some((a) => a.job_id === jobId && a.status !== "WITHDRAWN")))
      .catch(() => {});
  }, [viewerRole, jobId]);

  async function openDialog() {
    setOpen(true);
    setError("");
    if (cvs) return;
    try {
      const list = await api<Cv[]>("cvs");
      setCvs(list);
      setCvId(list.find((c) => c.is_primary)?.id ?? list[0]?.id ?? "");
    } catch (e) {
      setCvs([]);
      setError((e as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        "applications",
        "POST",
        {
          companyId,
          jobId,
          cvId,
          type: "JOB",
          subject: `Candidature — ${jobTitle}`,
          body: message,
          answers: {},
          confirm: true,
        },
        key.current
      );
      setApplied(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_APPLIED") {
        setApplied(true);
        setOpen(false);
      } else {
        setError((err as Error).message);
        key.current = crypto.randomUUID();
      }
    } finally {
      setBusy(false);
    }
  }

  if (closed) return <span className={`${base} bg-slate-100 text-slate-400`}>Offre clôturée</span>;

  if (!viewerRole) {
    return (
      <Link href="/login" className={`${base} bg-blue-600 text-white hover:bg-blue-700`}>
        Postuler maintenant
      </Link>
    );
  }

  if (viewerRole !== "candidat") return null;

  if (applied) {
    return (
      <div className="flex flex-col items-start gap-1 md:items-end">
        <span className={`${base} bg-emerald-50 text-emerald-700`}>✓ Candidature envoyée</span>
        <Link href="/dashboard/candidate/applications" className="text-xs text-blue-600 hover:underline">
          Suivre ma candidature
        </Link>
      </div>
    );
  }

  return (
    <>
      <button onClick={openDialog} className={`${base} bg-blue-600 text-white hover:bg-blue-700`}>
        Postuler maintenant
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">Postuler à cette offre</h2>
              <p className="text-sm text-slate-500">{jobTitle}</p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            {cvs === null ? (
              <p className="text-sm text-slate-500">Chargement de vos CV…</p>
            ) : cvs.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Ajoutez d&apos;abord un CV pour postuler.{" "}
                <Link href="/dashboard/candidate/cv" className="font-semibold underline">
                  Aller à Mon CV
                </Link>
              </p>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  CV à utiliser
                  <select
                    value={cvId}
                    onChange={(e) => setCvId(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {cvs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.original_filename}
                        {c.is_primary ? " — principal" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Message à l&apos;entreprise (facultatif)
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={15000}
                    placeholder="Présentez brièvement votre intérêt pour ce poste…"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy || !cvId}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? "Envoi…" : "Confirmer ma candidature"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
