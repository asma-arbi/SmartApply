"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Sparkles } from "lucide-react";
import { getJobMatchesAction } from "@/server/actions/matching.actions";

type MatchPreview = { id: string; title: string; companyName: string; city: string; score: number; href: string };

export function JobMatchesWidget() {
  const [items, setItems] = useState<MatchPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getJobMatchesAction().then((result) => {
      if (!cancelled) setItems((result.items as MatchPreview[]).slice(0, 2));
    }).catch(() => {
      if (!cancelled) setError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="sa-card p-4" aria-labelledby="job-match-widget-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="job-match-widget-title" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sa-text)]"><Sparkles className="size-4 text-[var(--sa-action)]"/> Offres pour votre profil</h2>
        <Link href="/matches" aria-label="Toutes les offres recommandées" className="text-[var(--sa-action)] hover:underline"><ArrowRight className="size-4"/></Link>
      </div>
      {loading ? <p className="mt-3 text-xs text-[var(--sa-text-secondary)]">Recherche d’offres publiées…</p> : error ? (
        <p className="mt-3 text-xs text-[var(--sa-text-secondary)]">Recommandations indisponibles. Réessayez plus tard.</p>
      ) : items.length ? (
        <ul className="mt-2 divide-y divide-[var(--sa-divider)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[var(--sa-action)]"><BriefcaseBusiness className="size-4"/></span>
              <div className="min-w-0 flex-1">
                <Link href={item.href} className="block truncate text-xs font-semibold text-[var(--sa-text)] hover:text-[var(--sa-action)] hover:underline">{item.title}</Link>
                <p className="truncate text-[11px] text-[var(--sa-text-secondary)]">{item.companyName}{item.city ? ` · ${item.city}` : ""}</p>
              </div>
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800">{item.score}%</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-xs text-[var(--sa-text-secondary)]">Aucune offre publiée à comparer pour le moment.</p>}
      <Link href="/matches" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--sa-action)] hover:underline">Voir mon matching <ArrowRight className="size-3.5"/></Link>
    </section>
  );
}
