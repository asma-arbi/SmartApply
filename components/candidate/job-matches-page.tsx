"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, MapPin, Sparkles } from "lucide-react";
import { getJobMatchesAction } from "@/server/actions/matching.actions";
import { useAuth } from "@/hooks/use-auth";

type Match = {
  id: string; title: string; city: string; type: string; companyId: string; companyName: string;
  description: string; requirements: string[]; score: number; matchedKeywords: string[]; href: string;
};

export function JobMatchesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Match[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getJobMatchesAction().then((result) => {
      if (cancelled) return;
      setItems(result.items as Match[]);
      setProfileReady(result.profileReady);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Chargement des offres impossible.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6">
      <header className="sa-card p-5 sm:p-7">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--sa-action)]"><Sparkles className="size-4"/> Matching personnalisé</p>
        <h1 className="sa-display mt-2 text-2xl font-bold text-[var(--sa-text)]">Offres recommandées pour vous</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sa-text-secondary)]">Le score compare vos compétences, votre formation et votre expérience avec les exigences des offres publiées.</p>
      </header>
      {!profileReady && !loading ? <p className="sa-card p-4 text-sm text-[var(--sa-text-secondary)]">Ajoutez des compétences et une expérience à votre profil pour obtenir des recommandations plus pertinentes. <Link href={user ? `/candidats/${encodeURIComponent(user.id)}` : "/login"} className="font-semibold text-[var(--sa-action)] hover:underline">Compléter mon profil</Link></p> : null}
      {error ? <p role="alert" className="sa-card p-4 text-sm text-red-600">{error}</p> : null}
      {!loading && !error && items.length ? <p className="text-xs text-[var(--sa-text-secondary)]">{items.length} offre{items.length > 1 ? "s" : ""} publiée{items.length > 1 ? "s" : ""} comparée{items.length > 1 ? "s" : ""}. Le score est calculé à partir de votre profil et des exigences indiquées par l’entreprise.</p> : null}
      {loading ? <p className="sa-card p-5 text-sm text-[var(--sa-text-secondary)]">Analyse des offres publiées…</p> : null}
      {!loading && !error && items.length === 0 ? <p className="sa-card p-5 text-sm text-[var(--sa-text-secondary)]">Aucune offre publiée à comparer pour le moment.</p> : null}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="sa-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/entreprises/${encodeURIComponent(item.companyId)}`} className="text-sm font-semibold text-[var(--sa-action)] hover:underline">{item.companyName}</Link>
                <h2 className="mt-1 text-lg font-semibold text-[var(--sa-text)]">{item.title}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--sa-text-secondary)]"><span className="inline-flex items-center gap-1"><MapPin className="size-3.5"/>{item.city || "Tunisie"}</span><span>·</span><span>{item.type}</span></p>
              </div>
              <div className="min-w-24 rounded-2xl bg-blue-50 px-3 py-2 text-center text-blue-800">
                <p className="text-xl font-bold">{item.score}%</p><p className="text-[10px] font-semibold uppercase tracking-wide">correspondance</p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${item.score}%` }}/></div>
              </div>
            </div>
            {item.description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--sa-text-secondary)]">{item.description}</p> : null}
            {item.matchedKeywords.length ? <p className="mt-3 text-xs text-[var(--sa-text-secondary)]">Points de correspondance : <span className="font-semibold text-[var(--sa-text)]">{item.matchedKeywords.join(" · ")}</span></p> : <p className="mt-3 text-xs text-[var(--sa-text-secondary)]">Aucun mot-clé commun trouvé. Vérifiez les compétences indiquées sur votre profil.</p>}
            {item.requirements.length ? <p className="mt-2 line-clamp-2 text-xs text-[var(--sa-text-muted)]">Demandé : {item.requirements.join(" · ")}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={item.href} className="sa-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"><BriefcaseBusiness className="size-4"/>Voir l’offre</Link>
              <Link href={user ? `/candidats/${encodeURIComponent(user.id)}` : "/login"} className="sa-btn-secondary inline-flex items-center px-4 py-2 text-sm">Compléter mon profil</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
