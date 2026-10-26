import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CandidateDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userName =
    (user?.user_metadata?.name as string) ||
    (user?.email ? user.email.split("@")[0] : "Candidat");

  const [
    { data: jobs },
    { data: companies, count: verifiedCount },
    { data: allPublishedJobs },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, companies(name, sector, city)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("companies")
      .select("id, name, sector, city, size, description, logo_url", { count: "exact" })
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("jobs")
      .select("id, company_id")
      .eq("status", "published"),
  ]);

  // Map job counts by company
  const jobCountByCompany: Record<string, number> = {};
  allPublishedJobs?.forEach((j) => {
    if (j.company_id) {
      jobCountByCompany[j.company_id] = (jobCountByCompany[j.company_id] || 0) + 1;
    }
  });

  const jobTypeColor: Record<string, string> = {
    Stage: "badge-blue",
    PFE: "badge-yellow",
    CDI: "badge-green",
    CDD: "badge-indigo",
    Freelance: "badge-gray",
  };

  const stats = [
    {
      label: "Offres disponibles",
      value: allPublishedJobs?.length ?? 0,
      color: "text-blue-600",
      bg: "bg-blue-50",
      icon: <BriefcaseIcon />,
    },
    {
      label: "Entreprises vérifiées",
      value: verifiedCount ?? companies?.length ?? 0,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      icon: <BuildingIcon />,
    },
    {
      label: "Mes candidatures",
      value: 0,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      icon: <SendIcon />,
    },
    {
      label: "Sauvegardés",
      value: 0,
      color: "text-amber-600",
      bg: "bg-amber-50",
      icon: <BookmarkIcon />,
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* ── Welcome Header ────────────────────────────────────────── */}
      <div className="card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bonjour, {userName} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Explorez les meilleures opportunités IT et les entreprises vérifiées en Tunisie.
          </p>
        </div>
        <Link
          href="/"
          className="btn-primary flex-shrink-0 text-xs sm:text-sm py-2.5 px-4"
        >
          <SearchIcon />
          Explorer toutes les offres
        </Link>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {s.label}
              </span>
              <span className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center text-slate-700`}>
                {s.icon}
              </span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Companies Section (Important) ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Entreprises vérifiées
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Recruteurs validés activement à la recherche de talents
            </p>
          </div>
          <Link
            href="/dashboard/candidate/companies"
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Voir toutes les entreprises →
          </Link>
        </div>

        {companies && companies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {companies.map((c) => {
              const count = jobCountByCompany[c.id] ?? 0;
              return (
                <div
                  key={c.id}
                  className="card p-6 flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
                >
                  <div className="space-y-3.5">
                    {/* Top row: Avatar + Sector Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-blue-500/20 flex-shrink-0">
                        {c.name?.charAt(0)?.toUpperCase() ?? "E"}
                      </div>
                      {c.sector && (
                        <span className="badge-blue text-xs font-semibold">
                          {c.sector}
                        </span>
                      )}
                    </div>

                    {/* Company details */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                        {c.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        {c.city && (
                          <span className="flex items-center gap-1">
                            <PinIcon />
                            {c.city}
                          </span>
                        )}
                        {c.size && (
                          <span>• {c.size} employés</span>
                        )}
                      </div>
                    </div>

                    {/* Description preview */}
                    {c.description && (
                      <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Card footer: Job count + Button */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      {count > 0 ? (
                        <span className="text-emerald-600 font-bold">
                          {count} offre{count > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400">0 offre active</span>
                      )}
                    </span>
                    <Link
                      href={`/?q=${encodeURIComponent(c.name)}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Voir les offres →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-3">
              <BuildingIcon />
            </div>
            <p className="text-slate-800 font-bold text-base">Aucune entreprise vérifiée</p>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">
              Les entreprises vérifiées par notre équipe s&apos;afficheront ici très prochainement.
            </p>
          </div>
        )}
      </section>

      {/* ── Recent Jobs Section ───────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Offres récentes</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Les derniers postes et stages publiés sur SmartApply
            </p>
          </div>
          <Link
            href="/"
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Voir tout le catalogue →
          </Link>
        </div>

        {jobs && jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((job) => {
              const company = job.companies as { name?: string; city?: string } | null;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="card p-6 flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all duration-200 group block"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-700 font-bold text-sm flex-shrink-0">
                        {company?.name?.charAt(0)?.toUpperCase() ?? "S"}
                      </div>
                      <span className={jobTypeColor[job.type] ?? "badge-gray"}>
                        {job.type}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                        {job.title}
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5 font-medium line-clamp-1">
                        {company?.name ?? "Entreprise"}
                      </p>
                    </div>

                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500">
                      <PinIcon />
                      {job.location}
                    </span>
                    <span>
                      {new Date(job.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-3">
              <BriefcaseIcon />
            </div>
            <p className="text-slate-800 font-bold text-base">Aucune offre disponible</p>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">
              Revenez bientôt pour découvrir les nouvelles offres publiées par les entreprises.
            </p>
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
    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
