import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminDeleteUser, adminUpdateUserRole } from "@/app/actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const ROLE_BADGE: Record<string, { label: string; class: string }> = {
  candidat: { label: "Candidat", class: "badge-blue" },
  entreprise: { label: "Entreprise", class: "badge-indigo" },
  admin: { label: "Administrateur", class: "badge-yellow" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { page?: string; role?: string; q?: string };
}) {
  const supabase = createClient();

  const currentPage = Math.max(1, parseInt(searchParams?.page ?? "1") || 1);
  const selectedRole = searchParams?.role ?? "all";
  const searchQ = (searchParams?.q ?? "").trim();

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Requête principale paginée avec colonnes minimales
  let query = supabase
    .from("profiles")
    .select("id, role, full_name, email, created_at, visible_to_companies", { count: "exact" });

  if (selectedRole && selectedRole !== "all") {
    query = query.eq("role", selectedRole);
  }
  if (searchQ) {
    query = query.or(`full_name.ilike.%${searchQ}%,email.ilike.%${searchQ}%,role.ilike.%${searchQ}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  // Requête de totaux en une seule passe via group (simulé via 2 requêtes légères head-only)
  const [
    { data: users, count: filteredCount },
    { count: totalCount },
  ] = await Promise.all([
    query,
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  // Comptes par rôle calculés côté client depuis le résultat total (plus rapide que 3 requêtes supplémentaires)
  // On fait un seul appel supplémentaire léger uniquement si on est sur la page "all"
  const [
    { count: candidateCount },
    { count: companyCount },
    { count: adminCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "candidat"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "entreprise"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
  ]);

  const totalPages = Math.ceil((filteredCount ?? 0) / PAGE_SIZE) || 1;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* ── En-tête de section ────────────────────────────────────── */}
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
            <span className="text-xs font-semibold text-slate-700">Utilisateurs</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gestion intelligente des Candidats & Utilisateurs
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Supervisez, filtrez et gérez les comptes même en cas de grand volume (pagination et tri côté serveur).
          </p>
        </div>

        <Link
          href="/dashboard/admin"
          className="btn-secondary text-xs self-start sm:self-auto"
        >
          Vue d&apos;ensemble
        </Link>
      </div>

      {/* ── Statistiques rapides des comptes ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total utilisateurs", value: totalCount ?? 0, color: "text-slate-900", role: "all" },
          { label: "Candidats", value: candidateCount ?? 0, color: "text-blue-600", role: "candidat" },
          { label: "Entreprises", value: companyCount ?? 0, color: "text-indigo-600", role: "entreprise" },
          { label: "Administrateurs", value: adminCount ?? 0, color: "text-amber-600", role: "admin" },
        ].map((s) => (
          <Link
            key={s.label}
            href={`/dashboard/admin/users?role=${s.role}`}
            className={[
              "card p-4 transition-all hover:border-blue-200",
              selectedRole === s.role ? "ring-2 ring-blue-500/20 border-blue-200 bg-blue-50/20" : "",
            ].join(" ")}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {s.label}
            </p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      {/* ── Barre de filtres et recherche intelligente ─────────────── */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {[
            { label: "Tous les rôles", value: "all" },
            { label: "Candidats uniquement", value: "candidat" },
            { label: "Entreprises", value: "entreprise" },
            { label: "Admins", value: "admin" },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={`/dashboard/admin/users?role=${tab.value}`}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                selectedRole === tab.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {filteredCount ?? 0} résultat{(filteredCount ?? 0) > 1 ? "s" : ""} trouvé{(filteredCount ?? 0) > 1 ? "s" : ""}
        </div>
      </div>

      {/* ── Table des utilisateurs ─────────────────────────────────── */}
      <div className="card overflow-hidden">
        {users && users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3.5 px-6">Utilisateur</th>
                    <th className="py-3.5 px-4">Rôle actuel</th>
                    <th className="py-3.5 px-4">Inscrit le</th>
                    <th className="py-3.5 px-6 text-right">Actions de gestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((u) => {
                    const badge = ROLE_BADGE[u.role] ?? { label: u.role, class: "badge-gray" };
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                              {u.role === "admin" ? "★" : u.role === "entreprise" ? "🏢" : (u.full_name?.[0]?.toUpperCase() || "C")}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-xs truncate">
                                {u.full_name || u.email || "Utilisateur"}
                              </p>
                              {u.email && (
                                <p className="text-[11px] text-slate-500 truncate">
                                  {u.email}
                                </p>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {u.id.slice(0, 8)}… {u.visible_to_companies ? "• Visible" : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={badge.class}>{badge.label}</span>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-500">
                          {new Date(u.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Basculer en Admin */}
                            {u.role !== "admin" && (
                              <form action={adminUpdateUserRole.bind(null, u.id, "admin")}>
                                <button
                                  type="submit"
                                  title="Promouvoir au rôle Administrateur"
                                  className="text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  + Rôle Admin
                                </button>
                              </form>
                            )}

                            {/* Basculer en Candidat si non candidat */}
                            {u.role !== "candidat" && (
                              <form action={adminUpdateUserRole.bind(null, u.id, "candidat")}>
                                <button
                                  type="submit"
                                  title="Attribuer le rôle Candidat"
                                  className="text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  Passer Candidat
                                </button>
                              </form>
                            )}

                            {/* Supprimer le compte */}
                            <form action={adminDeleteUser.bind(null, u.id)}>
                              <button
                                type="submit"
                                title="Supprimer ce compte définitivement"
                                className="text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Supprimer
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination intelligente ──────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/40">
              <p className="text-xs text-slate-500 font-medium">
                Affichage de {from + 1} à {Math.min(to + 1, filteredCount ?? 0)} sur {filteredCount ?? 0}
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/admin/users?role=${selectedRole}&page=${currentPage - 1}`}
                  className={[
                    "px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold transition-all",
                    currentPage <= 1
                      ? "pointer-events-none opacity-40 bg-slate-100 text-slate-400"
                      : "bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
                  ].join(" ")}
                  aria-disabled={currentPage <= 1}
                >
                  ← Précédent
                </Link>

                <span className="text-xs text-slate-500 font-medium px-2">
                  Page {currentPage} sur {totalPages}
                </span>

                <Link
                  href={`/dashboard/admin/users?role=${selectedRole}&page=${currentPage + 1}`}
                  className={[
                    "px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold transition-all",
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-40 bg-slate-100 text-slate-400"
                      : "bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
                  ].join(" ")}
                  aria-disabled={currentPage >= totalPages}
                >
                  Suivant →
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 text-center">
            <span className="text-3xl mb-2 block">👥</span>
            <p className="text-slate-800 font-bold text-sm">Aucun utilisateur trouvé</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Aucun profil ne correspond aux critères sélectionnés.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
