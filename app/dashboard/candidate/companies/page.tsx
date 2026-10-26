import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SIZE_LABEL: Record<string, string> = {
  "1-10": "1-10 emp.",
  "11-50": "11-50 emp.",
  "51-200": "51-200 emp.",
  "201-500": "201-500 emp.",
  "500+": "500+ emp.",
};

export default async function CandidateCompaniesPage({
  searchParams,
}: {
  searchParams?: { q?: string; sector?: string };
}) {
  const supabase = createClient();
  const q = (searchParams?.q ?? "").trim();
  const selectedSector = (searchParams?.sector ?? "").trim();

  let query = supabase
    .from("companies")
    .select("id, name, sector, size, city, logo_url, website, linkedin_url, description, created_at")
    .eq("status", "verified")
    .order("name", { ascending: true });

  if (q) {
    const cleanQ = q.replace(/[,()%]/g, "");
    query = query.or(
      `name.ilike.%${cleanQ}%,city.ilike.%${cleanQ}%,sector.ilike.%${cleanQ}%`
    );
  }

  if (selectedSector && selectedSector !== "all") {
    query = query.eq("sector", selectedSector);
  }

  const [{ data: companies }, { data: allJobs }] = await Promise.all([
    query,
    supabase.from("jobs").select("id, company_id").eq("status", "published"),
  ]);

  // Aggregate published jobs per company
  const jobCountByCompany: Record<string, number> = {};
  allJobs?.forEach((j) => {
    if (j.company_id) {
      jobCountByCompany[j.company_id] = (jobCountByCompany[j.company_id] || 0) + 1;
    }
  });

  const sectors = ["IT", "Finance", "Santé", "E-commerce", "Industrie", "Autre"];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="card p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/candidate"
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              ← Tableau de bord
            </Link>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs text-blue-600 font-medium">Entreprises</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Entreprises partenaires
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Découvrez toutes les entreprises vérifiées qui recrutent sur SmartApply.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-center">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Vérifiées
            </span>
            <span className="text-xl font-bold text-slate-900">
              {companies?.length ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <form method="GET" action="/dashboard/candidate/companies" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon />
            </div>
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher par nom d'entreprise, ville ou mot-clé…"
              className="input-field pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              name="sector"
              defaultValue={selectedSector}
              className="input-field py-2.5 px-3 text-sm min-w-[160px]"
            >
              <option value="">Tous les secteurs</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="btn-primary py-2.5 px-5 text-sm flex-shrink-0"
            >
              Filtrer
            </button>

            {(q || selectedSector) && (
              <Link
                href="/dashboard/candidate/companies"
                className="btn-secondary py-2.5 px-4 text-xs flex-shrink-0"
                title="Réinitialiser la recherche"
              >
                Effacer
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* ── Companies Grid ────────────────────────────────────────── */}
      {companies && companies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((c) => {
            const count = jobCountByCompany[c.id] ?? 0;
            return (
              <div
                key={c.id}
                className="card p-6 flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
              >
                <div className="space-y-4">
                  {/* Top: Avatar, Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-blue-500/20 flex-shrink-0">
                      {c.name?.charAt(0)?.toUpperCase() ?? "E"}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="badge-green text-[11px] font-semibold">
                        ✓ Vérifiée
                      </span>
                      {c.sector && (
                        <span className="badge-blue text-[11px] font-medium">
                          {c.sector}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Company Name & Meta */}
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
                      {c.name}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                      {c.city && (
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <PinIcon />
                          {c.city}
                        </span>
                      )}
                      {c.size && (
                        <span className="badge-gray text-[11px]">
                          {SIZE_LABEL[c.size] ?? c.size}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description Excerpt */}
                  <p className="text-slate-500 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                    {c.description ||
                      "Aucune description détaillée renseignée pour le moment par cette entreprise."}
                  </p>

                  {/* External links if available */}
                  {(c.website || c.linkedin_url) && (
                    <div className="flex items-center gap-3 pt-1 text-xs">
                      {c.website && (
                        <a
                          href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[160px]"
                        >
                          <GlobeIcon />
                          <span className="truncate">{c.website.replace(/^https?:\/\//, "")}</span>
                        </a>
                      )}
                      {c.linkedin_url && (
                        <a
                          href={c.linkedin_url.startsWith("http") ? c.linkedin_url : `https://${c.linkedin_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-blue-700 flex items-center gap-1"
                        >
                          <LinkedInIcon />
                          <span>LinkedIn</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Jobs Count + Link */}
                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    {count > 0 ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        {count} offre{count > 1 ? "s" : ""} active{count > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        0 offre active
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/?q=${encodeURIComponent(c.name)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 group-hover:translate-x-0.5 transition-all"
                  >
                    Voir les offres →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-16 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
            <BuildingIcon />
          </div>
          <p className="text-slate-800 font-bold text-lg">
            {q || selectedSector
              ? "Aucune entreprise ne correspond à votre recherche"
              : "Aucune entreprise vérifiée pour le moment"}
          </p>
          <p className="text-slate-500 text-sm mt-1 max-w-md">
            {q || selectedSector
              ? "Essayez d'élargir vos termes de recherche ou de retirer les filtres sélectionnés."
              : "Revenez prochainement pour découvrir la liste des entreprises partenaires vérifiées."}
          </p>
          {(q || selectedSector) && (
            <Link
              href="/dashboard/candidate/companies"
              className="btn-secondary mt-5 text-xs py-2 px-4"
            >
              Réinitialiser la recherche
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}
