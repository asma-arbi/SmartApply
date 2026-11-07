"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useNetwork } from "@/hooks/use-network";
import type { FeedSidebarData } from "@/lib/posts-api";
import { getFeedSidebarAction } from "@/server/actions/feed.actions";

export function RecommendationsDirectory() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const { following, follow } = useNetwork();
  const [data, setData] = useState<FeedSidebarData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void getFeedSidebarAction().then((next) => {
      if (!cancelled) setData(next);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Impossible de charger les recommandations.");
    });
    return () => { cancelled = true; };
  }, [ready, user?.id]);

  const companyUser = user?.role === "COMPANY";
  const candidates = data?.suggestedCandidates ?? [];
  const companies = data?.suggestedCompanies ?? [];

  return (
    <main className="mx-auto w-full max-w-[980px] space-y-4 px-3 py-6 sm:px-4">
      <header className="sa-card p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--sa-action)]">Réseau SmartApply</p>
        <h1 className="sa-display mt-1 text-2xl font-bold text-[var(--sa-text)]">{companyUser ? "Candidats à découvrir" : "Entreprises à suivre"}</h1>
        <p className="mt-1 text-sm text-[var(--sa-text-secondary)]">Suggestions récentes basées sur les profils et entreprises présents sur SmartApply.</p>
      </header>
      {error ? <p role="alert" className="sa-card p-4 text-sm text-[var(--sa-danger)]">{error}</p> : null}
      {!data ? <div className="sa-card p-6 text-sm text-[var(--sa-text-secondary)]">Chargement des recommandations…</div> : companyUser ? (
        candidates.length ? <ul className="grid gap-3 sm:grid-cols-2">{candidates.map((candidate) => {
          const href = `/candidats/${encodeURIComponent(candidate.id)}`;
          const initials = candidate.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
          const isFollowing = following("candidate", candidate.id);
          return <li key={candidate.id} className="sa-card flex gap-3 p-4">
            <Link href={href} className="shrink-0"><Avatar name={candidate.name} initials={initials || "CA"} src={candidate.avatarUrl} className="size-14" /></Link>
            <div className="min-w-0 flex-1">
              <Link href={href} className="font-semibold text-[var(--sa-text)] hover:text-[var(--sa-action)] hover:underline">{candidate.name}</Link>
              {(candidate.bio || candidate.headline || candidate.city) ? <p className="text-sm text-[var(--sa-text-secondary)]">{[candidate.bio || candidate.headline, candidate.city].filter(Boolean).join(" · ")}</p> : null}
              {candidate.skills.length ? <p className="mt-1 text-xs text-[var(--sa-text-muted)]">{candidate.skills.join(" · ")}</p> : null}
              <button type="button" onClick={() => {
                if (!user) { router.push(`/login?next=${encodeURIComponent("/candidats")}`); return; }
                follow("candidate", candidate.id);
              }} className="mt-2 rounded-full border border-[#2563eb] px-4 py-1 text-sm font-semibold text-[#2563eb] hover:bg-[#e8f0fe]">{isFollowing ? "Suivi" : "Suivre"}</button>
            </div>
          </li>;
        })}</ul> : <p className="sa-card p-5 text-sm text-[var(--sa-text-secondary)]">Aucun candidat avec un profil disponible à suggérer pour le moment.</p>
      ) : companies.length ? <ul className="grid gap-3 sm:grid-cols-2">{companies.map((company) => {
        const href = `/entreprises/${encodeURIComponent(company.id)}`;
        const initials = company.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
        const isFollowing = following("company", company.id);
        return <li key={company.id} className="sa-card flex gap-3 p-4">
          <Link href={href} className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] font-bold text-white">{initials || "EN"}</Link>
          <div className="min-w-0 flex-1">
            <Link href={href} className="font-semibold text-[var(--sa-text)] hover:text-[var(--sa-action)] hover:underline">{company.name}</Link>
            <p className="text-sm text-[var(--sa-text-secondary)]">{company.sector}{company.city ? ` · ${company.city}` : ""}</p>
            <p className="mt-1 text-xs text-[var(--sa-text-muted)]">{company.jobsCount} offre{company.jobsCount === 1 ? "" : "s"} publiée{company.jobsCount === 1 ? "" : "s"}</p>
            <button type="button" onClick={() => {
              if (!user) { router.push(`/login?next=${encodeURIComponent("/candidats")}`); return; }
              follow("company", company.id);
            }} className="mt-2 rounded-full border border-[#2563eb] px-4 py-1 text-sm font-semibold text-[#2563eb] hover:bg-[#e8f0fe]">{isFollowing ? "Abonné" : "Suivre"}</button>
          </div>
        </li>;
      })}</ul> : <p className="sa-card p-5 text-sm text-[var(--sa-text-secondary)]">Aucune entreprise vérifiée à suggérer pour le moment.</p>}
    </main>
  );
}
