import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();

  const [
    { count: usersCount },
    { count: companiesCount },
    { count: jobsCount },
    { count: pendingCount },
    { data: pendingCompanies },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("companies").select("*").eq("status", "pending").limit(5),
  ]);

  const stats = [
    { label: "Utilisateurs", value: usersCount ?? 0, icon: <UsersIcon />, gradient: "from-blue-500 to-blue-600" },
    { label: "Entreprises", value: companiesCount ?? 0, icon: <BuildingIcon />, gradient: "from-indigo-500 to-indigo-600" },
    { label: "Offres publiées", value: jobsCount ?? 0, icon: <BriefcaseIcon />, gradient: "from-violet-500 to-violet-600" },
    { label: "En attente", value: pendingCount ?? 0, icon: <ClockIcon />, gradient: "from-amber-500 to-amber-600" },
  ];

  const recentActivity = [
    { icon: "👤", text: "Nouvelle inscription candidat", time: "Il y a 5 min" },
    { icon: "🏢", text: "Nouvelle entreprise soumise", time: "Il y a 18 min" },
    { icon: "💼", text: "Offre publiée : Frontend Dev", time: "Il y a 1h" },
    { icon: "✅", text: "Entreprise vérifiée : TechCo", time: "Il y a 2h" },
    { icon: "🔒", text: "Offre clôturée : Backend Dev", time: "Il y a 3h" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord Admin</h1>
        <p className="text-slate-500 text-sm mt-1">
          Vue d&apos;ensemble de la plateforme SmartApply Tunisia.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-6 flex items-start gap-4">
            <div
              className={`w-12 h-12 bg-gradient-to-br ${s.gradient} rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg`}
            >
              <div className="w-5 h-5">{s.icon}</div>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{s.label}</p>
              <p className="text-3xl font-bold text-slate-900 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending companies */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Entreprises en attente</h2>
            {(pendingCount ?? 0) > 0 && (
              <span className="badge-yellow">{pendingCount} en attente</span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {pendingCompanies && pendingCompanies.length > 0 ? (
              pendingCompanies.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-700 font-bold text-sm flex-shrink-0">
                      {c.name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-900 font-medium text-sm truncate">{c.name}</p>
                      <p className="text-slate-400 text-xs">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button className="text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                      Vérifier
                    </button>
                    <button className="text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                      Rejeter
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-slate-500 text-sm">Aucune entreprise en attente</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Activité récente</h2>
          </div>
          <div className="p-6 space-y-4">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{a.icon}</span>
                <div>
                  <p className="text-slate-700 text-sm font-medium">{a.text}</p>
                  <p className="text-slate-400 text-xs">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Gérer utilisateurs", icon: "👥" },
            { label: "Vérifier entreprises", icon: "🏢" },
            { label: "Modérer offres", icon: "💼" },
            { label: "Voir rapports", icon: "📊" },
          ].map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-blue-100 transition-all text-center"
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-medium text-slate-600">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
