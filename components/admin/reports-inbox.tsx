"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";
import { REPORT_REASON_LABELS } from "@/lib/constants";
import { RelativeTime } from "@/components/layout/relative-time";
import { EmptyState } from "@/components/layout/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { useReports } from "@/hooks/use-posts";
import type { ReportStatus } from "@/types/post";
import { cn } from "@/lib/utils";

const TABS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "PENDING", label: "À traiter" },
  { value: "ACTIONED", label: "Traités" },
  { value: "DISMISSED", label: "Ignorés" },
];

export function ReportsInbox() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ReportStatus | "all">("PENDING");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const { reports, error, isLoading, review, counts } = useReports(tab);

  const selected = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );

  async function handleReview(action: "dismiss" | "archive" | "delete") {
    if (!selected) return;
    setReviewing(true);
    setReviewError("");
    try {
      await review(selected.id, action, note);
      setNote("");
    } catch (cause) {
      setReviewError(cause instanceof Error ? cause.message : "Impossible d’enregistrer cette décision.");
    } finally {
      setReviewing(false);
    }
  }

  if (!user) {
    return (
      <div className="sa-card mx-auto max-w-lg space-y-3 p-8 text-center">
        <p className="font-semibold text-[var(--sa-text)]">Connexion admin requise</p>
        <Link href="/login?next=/admin/reports" className="sa-btn-primary inline-flex px-4 py-2">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1128px] space-y-4">
      <div>
        <p className="text-[13px] text-[var(--sa-text-secondary)]">
          Administration · Modération des posts
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-[var(--sa-text)]">Posts signalés</h1>
      </div>

      {error ? <p role="alert" className="text-sm text-[var(--sa-danger)]">{error}</p> : null}
      {reviewError ? <p role="alert" className="sa-card p-3 text-sm text-[var(--sa-danger)]">{reviewError}</p> : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {([
          ["PENDING", "À traiter", "text-amber-700 bg-amber-50"],
          ["ACTIONED", "Traités", "text-emerald-700 bg-emerald-50"],
          ["DISMISSED", "Ignorés", "text-slate-700 bg-slate-100"],
        ] as const).map(([key, label, color]) => (
          <div key={key} className="sa-card p-3 sm:p-4">
            <p className="text-[11px] font-medium text-[var(--sa-text-secondary)] sm:text-xs">{label}</p>
            <p className={cn("mt-1 inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-lg font-bold tabular-nums", color)}>{counts[key]}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="sa-card space-y-3 p-4">
          <div className="sa-skeleton h-10 w-full" />
          <div className="sa-skeleton h-10 w-full" />
          <div className="sa-skeleton h-10 w-2/3" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.85fr)]">
          <div className="sa-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sa-divider)] px-3 py-2.5">
              <p className="text-sm font-semibold text-[var(--sa-text)]">File de signalements</p>
              <div className="flex flex-wrap gap-1">
                {TABS.map((item) => {
                  const count = item.value === "all" ? reports.length : counts[item.value];
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setTab(item.value);
                        setSelectedId(null);
                        setNote("");
                      }}
                      className={cn(
                        "sa-chip border text-[12px]",
                        tab === item.value
                          ? "sa-chip-active border-transparent"
                          : "border-[var(--sa-border)] bg-[var(--sa-card)] text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]",
                      )}
                    >
                      {item.label} {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<ShieldAlert className="size-5" />}
                  title="Aucun signalement ici"
                  description="Rien à traiter dans cet onglet."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-[var(--sa-divider)] bg-[var(--sa-surface-soft)] text-[12px] text-[var(--sa-text-secondary)]">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Post</th>
                      <th className="px-3 py-2.5 font-semibold">Signalé par</th>
                      <th className="px-3 py-2.5 font-semibold">Motif principal</th>
                      <th className="px-3 py-2.5 font-semibold">Signalements</th>
                      <th className="px-3 py-2.5 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => {
                      const active = (selected?.id ?? null) === report.id;
                      return (
                        <tr
                          key={report.id}
                          className={cn(
                            "cursor-pointer border-b border-[var(--sa-divider)] last:border-0",
                            active ? "bg-[var(--sa-action-soft)]" : "hover:bg-[var(--sa-hover)]",
                          )}
                          onClick={() => {
                            setSelectedId(report.id);
                            setNote("");
                          }}
                        >
                          <td className="max-w-[200px] truncate px-3 py-3 font-semibold text-[var(--sa-text)]">
                            {report.postTitle ?? "Publication"}
                          </td>
                          <td className="px-3 py-3 text-[var(--sa-text-secondary)]">
                            {report.reporterName}
                          </td>
                          <td className="px-3 py-3 text-[var(--sa-text-secondary)]">
                            {REPORT_REASON_LABELS[report.reason]}
                          </td>
                          <td className="px-3 py-3 tabular-nums text-[var(--sa-text-secondary)]">
                            {report.postReportCount ?? 1}
                          </td>
                          <td className="px-3 py-3">
                            <StatusPill status={report.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selected ? (
            <aside className="sa-card flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-[var(--sa-divider)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--sa-text)]">Détail du signalement</p>
                <button
                  type="button"
                  aria-label="Fermer le détail"
                  className="sa-btn-action p-1.5 lg:hidden"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="rounded-[8px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[var(--sa-border)] text-sm font-semibold text-[var(--sa-text-secondary)]">
                      ?
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--sa-text)]">
                        {selected.reporterName}
                      </p>
                      <p className="text-[12px] text-[var(--sa-text-muted)]">
                        <RelativeTime iso={selected.createdAt} />
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[var(--sa-text)]">
                    {selected.postTitle ?? "Publication signalée"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--sa-text-secondary)]">
                    {selected.postAuthorName ? `Publié par ${selected.postAuthorName} · ` : ""}
                    {selected.postReportCount ?? 1} signalement{(selected.postReportCount ?? 1) > 1 ? "s" : ""}
                  </p>
                </div>

                {selected.postContent ? (
                  <div className="rounded-xl border border-[var(--sa-border)] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sa-text-secondary)]">Contenu à vérifier</p>
                    <p className="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-[var(--sa-text)]">{selected.postContent}</p>
                  </div>
                ) : selected.postId ? (
                  <p className="rounded-xl bg-[var(--sa-surface-soft)] p-3 text-sm text-[var(--sa-text-secondary)]">Le contenu de cette publication n’est plus disponible.</p>
                ) : null}

                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--sa-text-secondary)]">
                    Motifs
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {(selected.reasonCounts ?? [{ reason: selected.reason, count: 1 }]).map((item) => (
                      <li key={item.reason} className="flex justify-between gap-3">
                        <span>{REPORT_REASON_LABELS[item.reason]}</span>
                        <span className="font-semibold tabular-nums">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selected.details ? (
                  <blockquote className="rounded-[8px] border border-[var(--sa-border)] bg-[var(--sa-page)] px-3 py-2 text-sm italic text-[var(--sa-text-secondary)]">
                    « {selected.details} »{" "}
                    <span className="not-italic">· Détail fourni par le membre.</span>
                  </blockquote>
                ) : null}

                <Link
                  href={`/posts/${selected.postId}`}
                  className="text-sm font-semibold text-[var(--sa-link)] hover:underline"
                >
                  Ouvrir le post
                </Link>

                <label className="block text-[12px] font-semibold text-[var(--sa-text-secondary)]">
                  Note de décision
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="mt-1 w-full rounded-[8px] border border-[var(--sa-input-border)] bg-[var(--sa-card)] px-3 py-2 text-sm font-normal text-[var(--sa-text)] outline-none focus:border-[var(--sa-action)]"
                    placeholder="Contexte interne pour l’équipe…"
                  />
                </label>

                <p className="text-[11px] leading-4 text-[var(--sa-text-muted)]">
                  Signalé le <RelativeTime iso={selected.createdAt} />.
                  {selected.reviewedAt ? <> Décision prise le <RelativeTime iso={selected.reviewedAt} />.</> : " En attente d’une décision."}
                </p>
                {selected.reviewNote ? <p className="rounded-lg bg-[var(--sa-surface-soft)] px-3 py-2 text-xs text-[var(--sa-text-secondary)]">Note de décision : {selected.reviewNote}</p> : null}
              </div>

              {selected.status === "PENDING" ? (
                <div className="flex flex-wrap gap-2 border-t border-[var(--sa-divider)] p-4">
                  <button
                    disabled={reviewing}
                    type="button"
                    className="rounded-[24px] border border-[var(--sa-danger)] px-3 py-1.5 text-sm font-semibold text-[var(--sa-danger)] hover:bg-[var(--sa-danger-soft)]"
                    onClick={() => void handleReview("delete")}
                  >
                    Retirer le post
                  </button>
                  <button
                    disabled={reviewing}
                    type="button"
                    className="sa-btn-secondary px-3 py-1.5 text-sm"
                    onClick={() => void handleReview("dismiss")}
                  >
                    Ignorer
                  </button>
                  <button
                    disabled={reviewing}
                    type="button"
                    className="sa-btn-secondary px-3 py-1.5 text-sm"
                    onClick={() => void handleReview("archive")}
                  >
                    Dépublier
                  </button>
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ReportStatus }) {
  const label =
    status === "PENDING" ? "À traiter" : status === "ACTIONED" ? "Traité" : "Ignoré";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
        status === "PENDING" && "bg-[var(--sa-danger-soft)] text-[var(--sa-danger)]",
        status === "ACTIONED" && "bg-[var(--sa-filter-active)]/15 text-[var(--sa-filter-active)]",
        status === "DISMISSED" && "bg-[var(--sa-surface-soft)] text-[var(--sa-text-secondary)]",
      )}
    >
      {label}
    </span>
  );
}
