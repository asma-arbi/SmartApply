"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Building2, FileSearch, ShieldAlert } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { listCompanyReportsAction, listReportsAction } from "@/server/actions/admin.actions";

type DashboardCounts = { pendingPosts: number; pendingCompanies: number };

export function AdminDashboard() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [posts, companies] = await Promise.all([
          listReportsAction("PENDING", 1, 1),
          listCompanyReportsAction("PENDING"),
        ]);
        if (!cancelled) {
          setCounts({ pendingPosts: posts.counts.PENDING ?? 0, pendingCompanies: companies.length });
          setError("");
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Impossible de charger le tableau de bord.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  return (
    <RoleGate allow={["ADMIN"]}>
      <main className="mx-auto w-full max-w-[1128px] space-y-5 px-3 py-6 sm:px-4">
        <header className="sa-card overflow-hidden">
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-5 py-7 text-white sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">SmartApply · Administration</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Centre de modération</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Examinez les signalements, vérifiez les publications et consignez chaque décision de modération.</p>
          </div>
        </header>

        {error ? <p role="alert" className="sa-card p-3 text-sm text-[var(--sa-danger)]">{error}</p> : null}

        <section aria-label="Signalements en attente" className="grid gap-3 sm:grid-cols-2">
          <DashboardLink href="/admin/reports" icon={<ShieldAlert className="size-5" />} title="Posts signalés" value={counts?.pendingPosts} description="Publications à vérifier et décisions à prendre" />
          <DashboardLink href="/admin/reports#companies" icon={<Building2 className="size-5" />} title="Entreprises signalées" value={counts?.pendingCompanies} description="Pages d’entreprise qui attendent une revue" />
        </section>

        <section className="sa-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563eb]"><FileSearch className="size-5" /></span>
            <div>
              <h2 className="font-semibold text-[var(--sa-text)]">Outils de modération</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--sa-text-secondary)]">Les motifs, les détails fournis, le contenu du post et son historique sont consultables avant de traiter un signalement.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/reports" className="sa-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"><ShieldAlert className="size-4" /> Ouvrir la file des signalements</Link>
            <Link href="/admin/posts" className="sa-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"><FileSearch className="size-4" /> Parcourir les publications</Link>
          </div>
        </section>
      </main>
    </RoleGate>
  );
}

function DashboardLink({ href, icon, title, value, description }: {
  href: string;
  icon: ReactNode;
  title: string;
  value?: number;
  description: string;
}) {
  return (
    <Link href={href} className="sa-card group flex items-start gap-4 p-5 transition-colors hover:border-[#2563eb]/40 hover:bg-[var(--sa-hover)]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--sa-action-soft)] text-[#2563eb]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="font-semibold text-[var(--sa-text)]">{title}</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-bold tabular-nums text-amber-800">{value ?? "…"}</span>
        </span>
        <span className="mt-1 block text-sm leading-5 text-[var(--sa-text-secondary)]">{description}</span>
      </span>
    </Link>
  );
}
