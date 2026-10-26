import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminDeleteJob, adminUpdateJobStatus } from "@/app/actions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  published: { label: "Publiée", class: "badge-green" },
  draft: { label: "Brouillon", class: "badge-gray" },
  closed: { label: "Clôturée", class: "badge-red" },
};

const JOB_TYPE_BADGE: Record<string, string> = {
  Stage: "badge-blue",
  PFE: "badge-yellow",
  CDI: "badge-green",
  CDD: "badge-indigo",
};

const PAGE_SIZE = 10;

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams?: { page?: string; status?: string; company?: string; type?: string; q?: string };
}) {
  const supabase = createClient();

  const currentPage = Math.max(1, parseInt(searchParams?.page ?? "1") || 1);
  const selectedStatus = searchParams?.status ?? "all";
  const selectedCompany = searchParams?.company ?? "all";
  const selectedType = searchParams?.type ?? "all";
  const searchQ = (searchParams?.q ?? "").trim();

  let query = supabase.from("jobs").select("*, companies(id, name)", { count: "exact" });

  if (selectedStatus && selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  if (selectedCompany && selectedCompany !== "all") {
    query = query.eq("company_id", selectedCompany);
  }

  if (selectedType && selectedType !== "all") {
    query = query.eq("type", selectedType);
  }

  if (searchQ) {
    query = query.or(`title.ilike.%${searchQ}%,location.ilike.%${searchQ}%`);
  }

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  query = query
    .order("created_at", { ascending: false })
    .range(from, to);

  const [
    { data: jobs, count: filteredCount },
    { count: totalCount },
    { count: publishedCount },
    { count: draftCount },
    { count: closedCount },
    { data: companiesList },
  ] = await Promise.all([
    query,
    supabase.from("jobs").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "closed"),
    supabase.from("companies").select("id, name").order("name"),
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
            <span className="text-xs font-semibold text-slate-700">Offres</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Supervision de toutes les Offres d&apos;emploi & Stages
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Gérez la publication, les statuts et la modération des offres de chaque entreprise.
          </p>
        </div>

        <Link
          href="/dashboard/admin"
          className="btn-secondary text-xs self-start sm:self-auto"
        >
          Vue d&apos;ensemble
        </Link>
      </div>

      {/* ── Statistiques Offres ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total des offres", value: totalCount ?? 0, color: "text-slate-900", status: "all" },
          { label: "Publiées (Actives)", value: publishedCount ?? 0, color: "text-emerald-600", status: "published" },
          { label: "Brouillons", value: draftCount ?? 0, color: "text-amber-600", status: "draft" },
          { label: "Clôturées", value: closedCount ?? 0, color: "text-slate-400", status: "closed" },
        ].map((s) => (
          <Link
            key={s.label}
            href={`/dashboard/admin/jobs?status=${s.status}`}
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

      {/* ── Filtres combinés et Recherche ─────────────────────────── */}
      <div className="card p-4 flex flex-col gap-3">
        <form method="GET" action="/dashboard/admin/jobs" className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* Recherche mot-clé */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Recherche
            </label>
            <input
              name="q"
              defaultValue={searchQ}
              placeholder="Titre, ville, techno…"
              className="input-field text-xs py-2"
            />
          </div>

          {/* Filtre Entreprise */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Entreprise
            </label>
            <select
              name="company"
              defaultValue={selectedCompany}
              className="input-field text-xs py-2 bg-white"
            >
              <option value="all">Toutes les entreprises</option>
              {companiesList?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Statut */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Statut
            </label>
            <select
              name="status"
              defaultValue={selectedStatus}
              className="input-field text-xs py-2 bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiée</option>
              <option value="draft">Brouillon</option>
              <option value="closed">Clôturée</option>
            </select>
          </div>

          {/* Bouton Filtrer */}
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary text-xs py-2 px-4 w-full">
              Appliquer filtres
            </button>
            {(searchQ || selectedCompany !== "all" || selectedStatus !== "all" || selectedType !== "all") && (
              <Link
                href="/dashboard/admin/jobs"
                className="btn-secondary text-xs py-2 px-3 flex-shrink-0"
                title="Réinitialiser tous les filtres"
              >
                ✕
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* ── Table des Offres ───────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {jobs && jobs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3.5 px-6">Poste / Offre</th>
                    <th className="py-3.5 px-4">Entreprise</th>
                    <th className="py-3.5 px-4">Contrat</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4">Lieu & Date</th>
                    <th className="py-3.5 px-6 text-right">Actions modération</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {jobs.map((j) => {
                    const company = j.companies as { id: string; name: string } | null;
                    const badge = STATUS_BADGE[j.status] ?? { label: j.status, class: "badge-gray" };
                    const typeBadge = JOB_TYPE_BADGE[j.type] ?? "badge-gray";

                    return (
                      <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <Link
                            href={`/jobs/${j.id}`}
                            target="_blank"
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-sm line-clamp-1"
                          >
                            {j.title}
                          </Link>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {j.id.substring(0, 8)}...</span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="font-semibold text-xs text-slate-700">
                            {company?.name || "Entreprise"}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className={typeBadge}>{j.type}</span>
                        </td>

                        <td className="py-4 px-4">
                          <span className={badge.class}>{badge.label}</span>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-500">
                          <p className="font-medium text-slate-700">{j.location}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(j.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {j.status !== "published" && (
                              <form action={adminUpdateJobStatus.bind(null, j.id, "published")}>
                                <button
                                  type="submit"
                                  title="Publier l'offre en direct"
                                  className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors"
                                >
                                  Publier
                                </button>
                              </form>
                            )}

                            {j.status !== "closed" && (
                              <form action={adminUpdateJobStatus.bind(null, j.id, "closed")}>
                                <button
                                  type="submit"
                                  title="Clôturer l'offre"
                                  className="text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                                >
                                  Clôturer
                                </button>
                              </form>
                            )}

                            <form action={adminDeleteJob.bind(null, j.id)}>
                              <button
                                type="submit"
                                title="Supprimer définitivement l'offre"
                                className="text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg transition-colors"
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
                Page {currentPage} sur {totalPages} ({filteredCount ?? 0} offres)
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/admin/jobs?status=${selectedStatus}&company=${selectedCompany}&page=${currentPage - 1}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""}`}
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
                  href={`/dashboard/admin/jobs?status=${selectedStatus}&company=${selectedCompany}&page=${currentPage + 1}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""}`}
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
            <span className="text-3xl mb-2 block">💼</span>
            <p className="text-slate-800 font-bold text-sm">Aucune offre trouvée</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Aucune offre d&apos;emploi ne correspond à vos filtres.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
