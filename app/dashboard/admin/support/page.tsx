import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getAllTickets, countPendingTickets } from "@/lib/support/db";
import { initSupportIndexes } from "@/lib/support/db";
import TicketStatusBadge from "@/app/dashboard/support/components/TicketStatusBadge";
import TicketUrgencyBadge from "@/app/dashboard/support/components/TicketUrgencyBadge";
import TicketCategoryBadge from "@/app/dashboard/support/components/TicketCategoryBadge";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { status?: string; category?: string };
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  // Auth & rôle admin uniquement
  const session = await getSessionUser();
  if (!session) redirect("/login?revoked=1");
  if (session.user.role !== "admin") redirect("/access-denied");

  // Initialiser les index (idempotent)
  await initSupportIndexes();

  const statusFilter = searchParams?.status || "all";
  const categoryFilter = searchParams?.category || "all";

  const [tickets, pendingCount] = await Promise.all([
    getAllTickets({
      status: statusFilter !== "all" ? statusFilter : undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
    }),
    countPendingTickets(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gestion des tickets support
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {pendingCount > 0 ? (
              <span className="text-amber-600 font-medium">
                ⚠ {pendingCount} ticket{pendingCount > 1 ? "s" : ""} en attente de traitement
              </span>
            ) : (
              "Tous les tickets sont traités. 🎉"
            )}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-4 flex flex-wrap gap-3">
        {/* Statut */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Statut :</span>
          {["all", "ouvert", "en_cours", "resolu", "clos"].map((s) => (
            <Link
              key={s}
              href={`/dashboard/admin/support?status=${s}&category=${categoryFilter}`}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "Tous" : s === "ouvert" ? "Ouvert" : s === "en_cours" ? "En cours" : s === "resolu" ? "Résolu" : "Clos"}
            </Link>
          ))}
        </div>

        {/* Catégorie */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Catégorie :</span>
          {["all", "bug", "paiement", "compte", "autre"].map((c) => (
            <Link
              key={c}
              href={`/dashboard/admin/support?status=${statusFilter}&category=${c}`}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                categoryFilter === c
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c === "all" ? "Toutes" : c}
            </Link>
          ))}
        </div>
      </div>

      {/* Tableau des tickets */}
      {tickets.length === 0 ? (
        <div className="card py-16 text-center">
          <span className="text-4xl mb-3 block">🎉</span>
          <p className="text-slate-800 font-semibold">Aucun ticket trouvé</p>
          <p className="text-slate-400 text-sm mt-1">
            Modifiez les filtres ou attendez de nouvelles demandes.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-3.5 px-5">Sujet</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Utilisateur</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Catégorie</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Urgence</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Créé le</th>
                  <th className="py-3.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className={[
                      "hover:bg-slate-50/60 transition-colors",
                      t.status === "ouvert" ? "bg-blue-50/20" : "",
                    ].join(" ")}
                  >
                    <td className="py-4 px-5">
                      <Link
                        href={`/dashboard/admin/support/${t.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                      >
                        {t.subject}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t.replies.length} réponse{t.replies.length !== 1 ? "s" : ""}
                      </p>
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          t.userRole === "entreprise"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {t.userRole}
                      </span>
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <TicketCategoryBadge
                        category={t.category}
                        aiClassified={t.aiClassified}
                      />
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <TicketUrgencyBadge urgency={t.urgency} />
                    </td>
                    <td className="py-4 px-4">
                      <TicketStatusBadge status={t.status} />
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500 hidden lg:table-cell">
                      {new Date(t.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/dashboard/admin/support/${t.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Traiter →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
