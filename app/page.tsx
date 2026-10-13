import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PublicPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role as string | undefined;

  const q = (searchParams.q ?? "").replace(/[,()%]/g, "");
  let query = supabase
    .from("jobs")
    .select("*, companies(name)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (q) query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
  const { data: jobs } = await query;

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
      {!q && (
        <section
          className="py-16 px-4 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e1b4b 100%)" }}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]"
               style={{
                 backgroundImage: "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
                 backgroundSize: "40px 40px",
               }} />
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="text-blue-400 text-sm">🇹🇳</span>
              <span className="text-blue-300 text-xs font-medium">Made for Tunisia</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Trouvez votre{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                emploi IT
              </span>{" "}
              en Tunisie
            </h1>
            <p className="text-slate-400 text-lg mb-8">
              Offres d&apos;emploi, stages et PFE pour les jeunes diplômés IT tunisiens.
            </p>

            {/* Hero search */}
            <form method="GET" action="/" className="flex gap-2 max-w-lg mx-auto">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <SearchIcon />
                </div>
                <input
                  id="hero-search"
                  name="q"
                  placeholder="Rechercher un poste, une entreprise…"
                  className="w-full bg-white/10 backdrop-blur border border-white/20 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
              >
                Rechercher
              </button>
            </form>

            {/* Stats */}
            <div className="flex justify-center gap-8 mt-10">
              {[
                { value: `${jobs?.length ?? 0}`, label: "offres actives" },
                { value: "500+", label: "entreprises IT" },
                { value: "12k+", label: "candidats" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-slate-400 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Jobs listing ─────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        {q && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {jobs?.length ?? 0} résultat{(jobs?.length ?? 0) > 1 ? "s" : ""} pour &quot;{q}&quot;
            </h2>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
              ✕ Effacer
            </Link>
          </div>
        )}

        {!q && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Offres récentes</h2>
            <span className="badge-gray">{jobs?.length ?? 0} offres</span>
          </div>
        )}

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
                      {new Date(job.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
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
