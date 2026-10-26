import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { verifyCompany, rejectCompany, adminDeleteCompany } from "@/app/actions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  verified: { label: "Vérifiée", class: "badge-green" },
  pending: { label: "En attente", class: "badge-yellow" },
  rejected: { label: "Refusée", class: "badge-red" },
};

const PAGE_SIZE = 10;

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams?: { page?: string; status?: string; q?: string };
}) {
  const supabase = createClient();

  const currentPage = Math.max(1, parseInt(searchParams?.page ?? "1") || 1);
  const selectedStatus = searchParams?.status ?? "all";
  const searchQ = (searchParams?.q ?? "").trim();

  let query = supabase.from("companies").select("*, jobs(count)", { count: "exact" });

  if (selectedStatus && selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  if (searchQ) {
    query = query.or(`name.ilike.%${searchQ}%,city.ilike.%${searchQ}%,sector.ilike.%${searchQ}%`);
  }

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const [
    { data: companies, count: filteredCount },
    { count: totalCount },
    { count: verifiedCount },
    { count: pendingCount },
    { count: rejectedCount },
  ] = await Promise.all([
    query,
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "verified"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "rejected"),
  ]);

  const totalPages = Math.ceil((filteredCount ?? 0) / PAGE_SIZE) || 1;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* ── En-tête ──────────────────────────────────────────────── */}
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
            <span className="text-xs font-semibold text-slate-700">Entreprises</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Supervision & Gestion des Entreprises
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Validez, modérez, filtrez et gérez l&apos;ensemble des partenaires recruteurs.
          </p>
        </div>

        <Link
          href="/dashboard/admin"
          className="btn-secondary text-xs self-start sm:self-auto"
        >
          Vue d&apos;ensemble
        </Link>
      </div>

      {/* ── Statistiques Entreprises ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total entreprises", value: totalCount ?? 0, color: "text-slate-900", status: "all" },
          { label: "En attente validation", value: pendingCount ?? 0, color: "text-amber-600", status: "pending" },
          { label: "Vérifiées", value: verifiedCount ?? 0, color: "text-emerald-600", status: "verified" },
          { label: "Refusées", value: rejectedCount ?? 0, color: "text-red-600", status: "rejected" },
        ].map((s) => (
          <Link
            key={s.label}
            href={`/dashboard/admin/companies?status=${s.status}`}
            className={[
              "card p-4 transition-all hover:border-blue-200",
              selectedStatus === s.status ? "ring-2 ring-blue-500/20 border-blue-200 bg-blue-50/20" : "",
            ].join(" ")}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {s.label}
            </p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      {/* ── Filtres et Recherche ──────────────────────────────────── */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form method="GET" action="/dashboard/admin/companies" className="flex items-center gap-2 w-full sm:w-auto">
          <input type="hidden" name="status" value={selectedStatus} />
          <input
            name="q"
            defaultValue={searchQ}
            placeholder="Rechercher entreprise, ville, secteur…"
            className="input-field text-xs py-2 w-full sm:w-64"
          />
          <button type="submit" className="btn-primary text-xs py-2 px-3 flex-shrink-0">
            Filtrer
          </button>
          {searchQ && (
            <Link
              href={`/dashboard/admin/companies?status=${selectedStatus}`}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Effacer
            </Link>
          )}
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { label: "Toutes", value: "all" },
            { label: "En attente", value: "pending" },
            { label: "Vérifiées", value: "verified" },
            { label: "Refusées", value: "rejected" },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={`/dashboard/admin/companies?status=${tab.value}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""}`}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                selectedStatus === tab.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Table des Entreprises ──────────────────────────────────── */}
      <div className="card overflow-hidden">
        {companies && companies.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3.5 px-6">Entreprise</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4">Secteur & Ville</th>
                    <th className="py-3.5 px-4">Offres</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-6 text-right">Actions modération</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {companies.map((c) => {
                    const badge = STATUS_BADGE[c.status] ?? { label: c.status, class: "badge-gray" };
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                              {c.name?.charAt(0)?.toUpperCase() ?? "E"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm leading-tight truncate">
                                {c.name}
                              </p>
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
                                <span className="text-[11px] text-slate-400">Sans site web</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={badge.class}>{badge.label}</span>
                          {c.status === "rejected" && c.rejection_reason && (
                            <p className="text-[10px] text-red-500 mt-1 line-clamp-1">
                              {c.rejection_reason}
                            </p>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <p className="text-xs font-semibold text-slate-800">{c.sector || "IT & Digital"}</p>
                          <p className="text-[11px] text-slate-400">{c.city || "Tunisie"}</p>
                        </td>

                        <td className="py-4 px-4">
                          <Link
                            href={`/dashboard/admin/jobs?company=${c.id}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                          >
                            <span>Offres liées →</span>
                          </Link>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-400">
                          {new Date(c.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {c.status !== "verified" && (
                              <form action={verifyCompany.bind(null, c.id)}>
                                <button
                                  type="submit"
                                  title="Valider l'entreprise"
                                  className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  ✓ Valider
                                </button>
                              </form>
                            )}

                            {c.status !== "rejected" && (
                              <form action={rejectCompany.bind(null, c.id, "Non validée par l'administrateur")}>
                                <button
                                  type="submit"
                                  title="Rejeter l'entreprise"
                                  className="text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  ✗ Rejeter
                                </button>
                              </form>
                            )}

                            <form action={adminDeleteCompany.bind(null, c.id)}>
                              <button
                                type="submit"
                                title="Supprimer définitivement l'entreprise et ses offres"
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

            {/* ── Pagination ────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/40">
              <p className="text-xs text-slate-500 font-medium">
                Page {currentPage} sur {totalPages} ({filteredCount ?? 0} entreprises)
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/admin/companies?status=${selectedStatus}&page=${currentPage - 1}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""}`}
                  className={[
                    "px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold transition-all",
                    currentPage <= 1
                      ? "pointer-events-none opacity-40 bg-slate-100 text-slate-400"
                      : "bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
                  ].join(" ")}
                >
                  ← Précédent
                </Link>

                <Link
                  href={`/dashboard/admin/companies?status=${selectedStatus}&page=${currentPage + 1}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""}`}
                  className={[
                    "px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold transition-all",
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-40 bg-slate-100 text-slate-400"
                      : "bg-white text-slate-700 hover:bg-slate-50 shadow-sm",
                  ].join(" ")}
                >
                  Suivant →
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 text-center">
            <span className="text-3xl mb-2 block">🏢</span>
            <p className="text-slate-800 font-bold text-sm">Aucune entreprise trouvée</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Modifiez vos filtres de recherche pour afficher des résultats.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
