"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listCompanyReportsAction, reviewCompanyReportAction } from "@/server/actions/admin.actions";
import { REPORT_REASON_LABELS } from "@/lib/constants";

type CompanyReportRow = {
  id: string;
  companyId: string;
  companyName: string;
  reporterName: string;
  reason: keyof typeof REPORT_REASON_LABELS;
  details: string | null;
  status: "PENDING" | "DISMISSED" | "ACTIONED";
  createdAt: string;
};

export function CompanyReportsInbox() {
  const [status, setStatus] = useState<CompanyReportRow["status"]>("PENDING");
  const [rows, setRows] = useState<CompanyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listCompanyReportsAction(status) as CompanyReportRow[]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les signalements.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function review(id: string, next: "DISMISSED" | "ACTIONED") {
    try {
      await reviewCompanyReportAction(id, next);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de traiter ce signalement.");
    }
  }

  return (
    <section className="sa-card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-[var(--sa-text)]">Signalements d’entreprise</h2>
          <p className="text-xs text-[var(--sa-text-secondary)]">Les signalements envoyés depuis les profils publics.</p>
        </div>
        <select aria-label="État des signalements entreprise" value={status} onChange={(event) => setStatus(event.target.value as CompanyReportRow["status"])} className="rounded-lg border border-[var(--sa-border)] bg-[var(--sa-card)] px-3 py-2 text-sm">
          <option value="PENDING">À traiter</option><option value="ACTIONED">Traités</option><option value="DISMISSED">Ignorés</option>
        </select>
      </div>
      {error ? <p role="alert" className="text-sm text-[var(--sa-danger)]">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--sa-text-secondary)]">Chargement…</p> : rows.length === 0 ? <p className="text-sm text-[var(--sa-text-secondary)]">Aucun signalement dans cette liste.</p> : (
        <ul className="divide-y divide-[var(--sa-divider)]">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 space-y-1 text-sm">
                <p className="font-semibold text-[var(--sa-text)]">{row.companyName} · {REPORT_REASON_LABELS[row.reason] ?? row.reason}</p>
                <p className="text-xs text-[var(--sa-text-secondary)]">Signalé par {row.reporterName} · {new Date(row.createdAt).toLocaleString("fr-FR")}</p>
                {row.details ? <p className="text-[var(--sa-text-secondary)]">{row.details}</p> : null}
                <Link className="text-[var(--sa-action)] hover:underline" href={`/entreprises/${encodeURIComponent(row.companyId)}`}>Ouvrir la page entreprise</Link>
              </div>
              {row.status === "PENDING" ? <div className="flex gap-2"><button type="button" onClick={() => void review(row.id, "DISMISSED")} className="sa-btn-secondary px-3 py-1.5 text-xs">Ignorer</button><button type="button" onClick={() => void review(row.id, "ACTIONED")} className="sa-btn-primary px-3 py-1.5 text-xs">Traiter</button></div> : <span className="text-xs text-[var(--sa-text-muted)]">{row.status === "ACTIONED" ? "Traité" : "Ignoré"}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
