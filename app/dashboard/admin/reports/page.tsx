import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const supabase = createClient();

  const [
    { count: totalUsers },
    { count: candidateCount },
    { count: companyCount },
    { count: adminCount },
    { count: totalJobs },
    { count: publishedJobs },
    { count: draftJobs },
    { count: verifiedCompanies },
    { count: pendingCompanies },
    { count: rejectedCompanies },
    { data: jobsList },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "candidat"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "entreprise"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "verified"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("jobs").select("type, location"),
  ]);

  // Calculs statistiques
  const totalComp = (verifiedCompanies ?? 0) + (pendingCompanies ?? 0) + (rejectedCompanies ?? 0);
  const approvalRate = totalComp > 0 ? Math.round(((verifiedCompanies ?? 0) / totalComp) * 100) : 100;

  // Répartition par type de contrat
  const typeMap: Record<string, number> = {};
  jobsList?.forEach((j) => {
    const t = j.type || "CDI";
    typeMap[t] = (typeMap[t] || 0) + 1;
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* ── Breadcrumb & Title ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/admin"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Administration
            </Link>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-semibold text-slate-700">Rapports & Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Analytique & Performances
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Indicateurs clés du marché de l&apos;emploi IT en Tunisie et activité de la plateforme.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/users"
            className="btn-secondary text-xs"
          >
            Voir les Candidats
          </Link>
          <Link
            href="/dashboard/admin/companies"
            className="btn-primary text-xs"
          >
            Modérer les Entreprises
          </Link>
        </div>
      </div>

      {/* ── Top KPIs Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Inscrits</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalUsers ?? 0}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <span className="text-blue-600 font-semibold">{candidateCount ?? 0}</span> candidats •{" "}
            <span className="text-indigo-600 font-semibold">{companyCount ?? 0}</span> entr.
          </div>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Taux de Validation</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">{approvalRate}%</p>
          <p className="text-xs text-slate-500 mt-2">
            {verifiedCompanies ?? 0} entreprises vérifiées sur {totalComp}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Offres en Ligne</p>
          <p className="text-3xl font-black text-blue-600 mt-2">{publishedJobs ?? 0}</p>
          <p className="text-xs text-slate-500 mt-2">
            {publishedJobs ?? 0} publiées • {draftJobs ?? 0} brouillon(s)
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Équipe Admin</p>
          <p className="text-3xl font-black text-amber-600 mt-2">{adminCount ?? 1}</p>
          <p className="text-xs text-slate-500 mt-2">
            Accès superviseurs actifs
          </p>
        </div>
      </div>

      {/* ── Charts & Breakdowns ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Répartition des Utilisateurs */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Répartition des Utilisateurs par Rôle
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>Candidats (Chercheurs d&apos;emploi / Étudiants)</span>
                <span className="font-bold">{candidateCount ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{
                    width: `${totalUsers ? ((candidateCount ?? 0) / totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>Entreprises (Recruteurs partenaires)</span>
                <span className="font-bold">{companyCount ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full"
                  style={{
                    width: `${totalUsers ? ((companyCount ?? 0) / totalUsers) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>Super Administrateurs</span>
                <span className="font-bold">{adminCount ?? 1}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{
                    width: `${totalUsers ? ((adminCount ?? 1) / totalUsers) * 100 : 5}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Base de données : Supabase Cloud (PostgreSQL 15)</span>
            <span className="text-emerald-600 font-semibold">● Synchronisé</span>
          </div>
        </div>

        {/* Card: État des Entreprises & Modération */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Statut de Vérification des Entreprises
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <p className="text-2xl font-bold text-emerald-700">{verifiedCompanies ?? 0}</p>
              <p className="text-xs text-emerald-800 font-medium mt-1">Vérifiées</p>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-center">
              <p className="text-2xl font-bold text-amber-700">{pendingCompanies ?? 0}</p>
              <p className="text-xs text-amber-800 font-medium mt-1">En attente</p>
            </div>
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-center">
              <p className="text-2xl font-bold text-red-700">{rejectedCompanies ?? 0}</p>
              <p className="text-xs text-red-800 font-medium mt-1">Rejetées</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              La modération garantit aux candidats des offres vérifiées émanant d&apos;entreprises réelles enregistrées au Registre National des Entreprises (RNE).
            </p>
            {(pendingCompanies ?? 0) > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                <span>⚠️ {pendingCompanies} entreprise(s) attendent votre validation.</span>
                <Link
                  href="/dashboard/admin/companies?status=pending"
                  className="font-bold text-amber-800 underline hover:no-underline"
                >
                  Modérer maintenant →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Types d'offres d'emploi ─────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-slate-900 mb-2">
          Offres d&apos;emploi par Type de Contrat
        </h2>
        <p className="text-slate-500 text-xs mb-6">
          Distribution des postes recherchés par les entreprises partenaires de SmartApply Tunisia.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["CDI", "Stage PFE", "CDD", "Freelance"].map((type) => {
            const count = typeMap[type] || 0;
            return (
              <div key={type} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">{type}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {totalJobs ? Math.round((count / totalJobs) * 100) : 0}% des offres
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
