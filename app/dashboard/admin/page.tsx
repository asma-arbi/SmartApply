import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { verifyCompany, rejectCompany, promoteSelfToAdmin } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();

  // Requêtes optimisées — le moins de round-trips possible vers Supabase
  const [
    { count: usersCount },
    { count: companiesCount },
    { count: jobsCount },
    { count: pendingCount },
    { data: pendingCompanies },
    { data: recentUsers },
    { data: recentJobs },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("companies")
      .select("id, name, sector, city, website, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("profiles")
      .select("id, role, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("jobs")
      .select("id, title, status, created_at, companies(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      label: "Utilisateurs inscrits",
      value: usersCount ?? 0,
      icon: <UsersIcon />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/dashboard/admin/users",
    },
    {
      label: "Entreprises partenaires",
      value: companiesCount ?? 0,
      icon: <BuildingIcon />,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      link: "/dashboard/admin/companies",
    },
    {
      label: "Offres publiées",
      value: jobsCount ?? 0,
      icon: <BriefcaseIcon />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      link: "/dashboard/admin/jobs",
    },
    {
      label: "Entreprises à modérer",
      value: pendingCount ?? 0,
      icon: <ClockIcon />,
      color: "text-amber-600",
      bg: "bg-amber-50",
      link: "/dashboard/admin/companies?status=pending",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* ── Topbar / Header ───────────────────────────────────────── */}
      <div className="card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/60 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <span>🛡️ Espace Super Administrateur</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tour de Contrôle SmartApply
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Supervision globale, modération des entreprises, gestion des candidats et des offres.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(pendingCount ?? 0) > 0 && (
            <Link
              href="/dashboard/admin/companies?status=pending"
              className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {pendingCount} à vérifier
            </Link>
          )}

          {/* Outil d'auto-promotion admin si besoin */}
          <form action={promoteSelfToAdmin}>
            <button
              type="submit"
              title="Synchroniser mes droits Administrateur"
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-medium transition-colors"
            >
              Sync Droits Admin
            </button>
          </form>
        </div>
      </div>

      {/* ── Modules d'accès direct ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/admin/users"
          className="card p-5 hover:border-blue-200 hover:shadow-md transition-all group flex items-start justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <UsersIcon />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Gestion des Candidats</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Recherche intelligente, filtres, pagination grand volume & gestion des rôles.
            </p>
          </div>
          <span className="text-blue-600 font-bold text-sm">→</span>
        </Link>

        <Link
          href="/dashboard/admin/companies"
          className="card p-5 hover:border-indigo-200 hover:shadow-md transition-all group flex items-start justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <BuildingIcon />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Gestion des Entreprises</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Validation des dossiers, filtrage par statut/ville & suppression.
            </p>
          </div>
          <span className="text-indigo-600 font-bold text-sm">→</span>
        </Link>

        <Link
          href="/dashboard/admin/jobs"
          className="card p-5 hover:border-emerald-200 hover:shadow-md transition-all group flex items-start justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <BriefcaseIcon />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Gestion des Offres</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Supervision des offres par entreprise, changement de statut & modération.
            </p>
          </div>
          <span className="text-emerald-600 font-bold text-sm">→</span>
        </Link>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.link} className="card p-6 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {s.label}
              </span>
              <span className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center text-slate-700`}>
                {s.icon}
              </span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      {/* ── Pending Companies Section ─────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">
                Entreprises en attente de validation
              </h2>
              {(pendingCount ?? 0) > 0 && (
                <span className="badge-yellow font-bold text-xs">
                  {pendingCount}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Dossiers à valider pour autoriser la publication d&apos;offres visibles.
            </p>
          </div>

          <Link
            href="/dashboard/admin/companies?status=pending"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
          >
            Voir tout ({pendingCount ?? 0}) →
          </Link>
        </div>

        {pendingCompanies && pendingCompanies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-3.5 px-6">Entreprise</th>
                  <th className="py-3.5 px-4">Secteur</th>
                  <th className="py-3.5 px-4">Ville</th>
                  <th className="py-3.5 px-4">Date de demande</th>
                  <th className="py-3.5 px-6 text-right">Actions rapides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {pendingCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-800 font-bold rounded-xl flex items-center justify-center flex-shrink-0 text-sm">
                          {c.name?.charAt(0)?.toUpperCase() ?? "E"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{c.name}</p>
                          {c.website ? (
                            <a
                              href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {c.website.replace(/^https?:\/\//, "")}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Sans site web</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="badge-blue text-xs">{c.sector || "IT & Digital"}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-xs">
                      {c.city || "Tunisie"}
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <form action={verifyCompany.bind(null, c.id)}>
                          <button
                            type="submit"
                            className="text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <span>✓</span> Valider
                          </button>
                        </form>
                        <form action={rejectCompany.bind(null, c.id, "Dossier non validé par l'administrateur")}>
                          <button
                            type="submit"
                            className="text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <span>✗</span> Rejeter
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center px-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg mb-2">
              ✓
            </div>
            <p className="text-slate-800 font-bold text-sm">Toutes les entreprises sont à jour !</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Aucun dossier n&apos;est actuellement en attente de validation.
            </p>
          </div>
        )}
      </div>

      {/* ── Grille 2 Colonnes : Récents Candidats & Offres ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Derniers Utilisateurs inscrits */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm">Derniers utilisateurs enregistrés</h2>
            <Link
              href="/dashboard/admin/users"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Gérer ({usersCount ?? 0}) →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentUsers && recentUsers.length > 0 ? (
              recentUsers.map((u) => {
                const initials = u.full_name
                  ? u.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                  : u.email
                  ? u.email[0].toUpperCase()
                  : u.role === "admin" ? "★" : u.role === "entreprise" ? "E" : "C";
                const roleBgMap: Record<string, string> = {
                  admin: "bg-amber-100 text-amber-800",
                  entreprise: "bg-indigo-100 text-indigo-700",
                  candidat: "bg-blue-100 text-blue-700",
                };
                return (
                  <div key={u.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 ${roleBgMap[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {u.full_name || u.email || `Utilisateur ${u.id.slice(0, 8)}`}
                        </p>
                        {u.email && u.full_name && (
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        )}
                        <p className="text-[10px] text-slate-300">
                          {new Date(u.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${roleBgMap[u.role] ?? "bg-slate-100 text-slate-500"}`}>
                      {u.role}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-600 mb-1">Aucun utilisateur visible</p>
                <p className="text-xs text-slate-400">
                  Exécutez le script SQL <code className="bg-slate-100 px-1 rounded">INSTALL_COMPLETE_SCHEMA.sql</code> pour synchroniser les profils.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dernières offres publiées */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm">Dernières offres publiées</h2>
            <Link
              href="/dashboard/admin/jobs"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Superviser ({jobsCount ?? 0}) →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentJobs && recentJobs.length > 0 ? (
              recentJobs.map((j) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const comp = (j.companies as any) as { name: string } | null | { name: string }[];
                const compName = Array.isArray(comp) ? comp[0]?.name : comp?.name;
                return (
                  <div key={j.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 text-xs truncate">
                        {j.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {compName || "Entreprise"}
                      </p>
                    </div>
                    <span className="badge-green text-[11px] flex-shrink-0">{j.status}</span>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Aucune offre récente
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
