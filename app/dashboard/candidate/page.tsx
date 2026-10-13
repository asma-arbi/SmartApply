import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CandidateDashboard() {
  const supabase = createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, companies(name)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, status")
    .eq("status", "verified")
    .limit(8);

  const jobTypeColor: Record<string, string> = {
    Stage: "badge-blue",
    PFE: "badge-yellow",
    CDI: "badge-green",
    CDD: "badge-indigo",
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bonjour 👋</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Découvrez les opportunités IT qui vous correspondent.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Offres disponibles", value: jobs?.length ?? 0, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Entreprises", value: companies?.length ?? 0, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Candidatures", value: 0, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Sauvegardés", value: 0, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
              {s.label}
            </p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search shortcut */}
      <Link
        href="/"
        className="flex items-center gap-3 card p-4 hover:shadow-md hover:border-blue-100 transition-all group"
      >
        <div className="w-9 h-9 flex items-center justify-center bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-100 transition-colors flex-shrink-0">
          <SearchIcon />
        </div>
        <span className="text-slate-400 text-sm">
          Rechercher un poste, une entreprise ou une ville…
        </span>
        <span className="ml-auto text-xs text-slate-300 font-mono hidden sm:block">⌘ K</span>
      </Link>

      {/* Recent jobs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Offres récentes</h2>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Voir tout →
          </Link>
        </div>

        {jobs && jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => {
              const company = job.companies as { name: string } | null;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="card-hover p-5 block group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center text-blue-700 font-bold text-base border border-blue-100 flex-shrink-0">
                      {company?.name?.charAt(0) ?? "?"}
                    </div>
                    <span className={jobTypeColor[job.type] ?? "badge-gray"}>
                      {job.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm">
                    {job.title}
                  </h3>
                  <p className="text-slate-500 text-xs mb-3">{company?.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <PinIcon />
                    <span>{job.location}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <EmptyIcon />
            <p className="text-slate-600 font-medium mt-4">Aucune offre disponible</p>
            <p className="text-slate-400 text-sm mt-1">Les offres apparaîtront ici dès leur publication.</p>
          </div>
        )}
      </section>

      {/* Companies */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Entreprises partenaires</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Voir tout →
          </button>
        </div>

        {companies && companies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {companies.map((c) => (
              <div
                key={c.id}
                className="card-hover p-4 flex flex-col items-center gap-2 cursor-pointer text-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-700 font-bold text-sm">
                  {c.name?.charAt(0) ?? "?"}
                </div>
                <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-tight">
                  {c.name}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card py-10 text-center text-slate-400 text-sm">
            Aucune entreprise vérifiée pour le moment.
          </div>
        )}
      </section>
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
    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function EmptyIcon() {
  return (
    <svg className="w-14 h-14 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
