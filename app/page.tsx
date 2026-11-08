import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import { logout } from "@/app/actions";
import { PostsFeed } from "@/cv-module/components/posts";

export const dynamic = "force-dynamic";

export default async function PublicPage({
  searchParams,
}: {
  searchParams: { q?: string; company?: string };
}) {
  const sessionData = await getSessionUser();
  const user = sessionData?.user;
  const role = user?.role;

  const q = (searchParams.q ?? "").trim();
  const companyId = searchParams.company;

  const db = await getDb();

  // Fetch company-created jobs
  const pipeline: any[] = [
    { $match: { status: "published" } },
    { $sort: { created_at: -1 } },
    {
      $lookup: {
        from: "companies",
        localField: "company_id",
        foreignField: "id",
        as: "companies",
      },
    },
    {
      $unwind: {
        path: "$companies",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (companyId) {
    pipeline.unshift({ $match: { company_id: companyId } });
  } else if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    pipeline.push({
      $match: {
        $or: [
          { title: regex },
          { location: regex },
          { "companies.name": regex },
        ],
      },
    });
  }

  const companyJobs = await db.collection("jobs").aggregate(pipeline).toArray();

  // Fetch external opportunities (scraped jobs)
  const externalQuery: any = { is_active: true };
  
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    externalQuery.$or = [
      { title: regex },
      { company_name: regex },
      { location: regex },
    ];
  }

  const externalJobs = await db
    .collection("external_jobs")
    .find(externalQuery)
    .sort({ scraped_at: -1 })
    .limit(30)
    .toArray();

  // Combine both sources
  const allJobs = [
    ...companyJobs.map((job: any) => ({
      ...job,
      source: "company" as const,
    })),
    ...externalJobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      location: job.location,
      type: job.type,
      created_at: job.scraped_at,
      companies: { name: job.company_name },
      source: "external" as const,
      external_url: job.external_url,
      external_source: job.source,
    })),
  ];

  // Sort combined results by date
  const jobs = allJobs.sort((a: any, b: any) => {
    const dateA = new Date(a.created_at || a.scraped_at).getTime();
    const dateB = new Date(b.created_at || b.scraped_at).getTime();
    return dateB - dateA;
  });

  const jobTypeColor: Record<string, string> = {
    Stage: "badge-blue",
    PFE: "badge-yellow",
    CDI: "badge-green",
    CDD: "badge-indigo",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-slate-900 font-bold text-sm leading-none">SmartApply</p>
              <p className="text-blue-600 text-[10px] leading-none">Tunisia</p>
            </div>
          </Link>

          {/* Search bar */}
          <form method="GET" action="/" className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <SearchIcon />
              </div>
              <input
                id="search-input"
                name="q"
                defaultValue={q}
                placeholder="Poste, entreprise ou ville…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </form>

          {/* Auth nav */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <>
                {role && (
                  <Link
                    href={
                      role === "admin"
                        ? "/dashboard/admin"
                        : role === "entreprise"
                        ? "/dashboard/company"
                        : "/dashboard/candidate"
                    }
                    className="hidden sm:block text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    Mon espace
                  </Link>
                )}
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-sm text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Déconnexion
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  id="btn-nav-register"
                  className="btn-primary py-2 px-4 text-xs"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      {!q && !companyId && (
        <section className="py-14 px-4 text-center border-b border-slate-100 bg-white">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3.5 py-1 mb-5">
              <span className="text-sm">🇹🇳</span>
              <span className="text-blue-700 text-xs font-semibold">Plateforme de recrutement IT en Tunisie</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
              Trouvez votre{" "}
              <span className="text-blue-600">opportunité IT</span>{" "}
              en Tunisie
            </h1>
            <p className="text-slate-500 text-base sm:text-lg mb-8 max-w-xl mx-auto">
              Offres d&apos;emploi, stages PFE et alternances sélectionnés auprès des meilleures entreprises tech tunisiennes.
            </p>

            {/* Hero search */}
            <form method="GET" action="/" className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <SearchIcon />
                </div>
                <input
                  id="hero-search"
                  name="q"
                  placeholder="Poste, technologie, entreprise ou ville…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98]"
              >
                Rechercher
              </button>
            </form>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-10 pt-8 border-t border-slate-100">
              {[
                { value: `${jobs?.length ?? 0}`, label: "Offres actives" },
                { value: "500+", label: "Entreprises tech" },
                { value: "12k+", label: "Candidats qualifiés" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-slate-400 text-xs mt-0.5 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Jobs listing ─────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        {(q || companyId) && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {jobs?.length ?? 0} résultat{(jobs?.length ?? 0) > 1 ? "s" : ""}{" "}
              {q ? `pour "${q}"` : "pour cette entreprise"}
            </h2>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
              ✕ Effacer
            </Link>
          </div>
        )}

        {!q && !companyId && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Offres récentes</h2>
            <span className="badge-gray">{jobs?.length ?? 0} offres</span>
          </div>
        )}

        {jobs && jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job: any) => {
              const company = job.companies as { name: string } | null;
              const isExternal = job.source === "external";
              const jobUrl = isExternal ? job.external_url : `/jobs/${job.id}`;
              
              return (
                <Link
                  key={job.id}
                  href={jobUrl}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="card-hover p-5 block group relative"
                >
                  {isExternal && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold text-amber-700">
                      <ExternalIcon />
                      {job.external_source === "keejob" ? "Keejob" : job.external_source}
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                      {company?.name?.charAt(0) ?? "?"}
                    </div>
                    <span className={jobTypeColor[job.type] ?? "badge-gray"}>
                      {job.type}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm">
                    {job.title}
                  </h3>
                  <p className="text-slate-500 text-xs mb-3 font-medium">{company?.name}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <PinIcon /> {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon />
                      {new Date(job.created_at || job.scraped_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🔍</span>
            <p className="text-slate-700 font-semibold text-lg">Aucune offre trouvée</p>
            <p className="text-slate-400 text-sm mt-2 mb-6">
              {q ? `Aucun résultat pour « ${q} ». Essayez d'autres mots-clés.` : "Aucune offre disponible pour le moment."}
            </p>
            {!user && (
              <Link href="/register" className="btn-primary px-6">
                Créer un compte gratuitement
              </Link>
            )}
          </div>
        )}
      </main>

      {!q && !companyId && (
        <div className="posts-public-container">
          <PostsFeed
            canInteract={!!user}
            canPublish={!!user && user.role !== 'admin'}
            manageHref={user?.role === 'admin' ? '/dashboard/admin/posts' : '/dashboard/posts?view=mine'}
          />
        </div>
      )}

      {/* ── Footer ──────────────────────────────────── */}
      {!user && (
        <footer className="border-t border-slate-200 bg-white mt-10">
          <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">S</span>
              </div>
              <span className="text-slate-500 text-sm font-medium">SmartApply Tunisia</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/register" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                Créer un compte
              </Link>
              <Link href="/register?role=entreprise" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                Espace entreprise
              </Link>
              <Link href="/register?role=admin" className="text-sm text-amber-600 hover:text-amber-700 font-semibold transition-colors">
                Espace admin
              </Link>
              <Link href="/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                Connexion
              </Link>
            </div>
            <p className="text-slate-400 text-xs">© 2026 SmartApply Tunisia. Tous droits réservés.</p>
          </div>
        </footer>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function PinIcon() {
  return (
    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
