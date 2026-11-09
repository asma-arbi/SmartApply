import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getUserTickets } from "@/lib/support/db";
import TicketStatusBadge from "./components/TicketStatusBadge";
import TicketUrgencyBadge from "./components/TicketUrgencyBadge";
import TicketCategoryBadge from "./components/TicketCategoryBadge";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  // Auth & rôle
  const session = await getSessionUser();
  if (!session) redirect("/login?revoked=1");
  if (session.user.role === "admin") redirect("/dashboard/admin/support");

  const tickets = await getUserTickets(session.user.id);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Aide &amp; Support</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Signalez un problème ou suivez vos demandes d&apos;assistance.
          </p>
        </div>
        <Link
          href="/dashboard/support/new"
          className="btn-primary self-start sm:self-auto min-h-[44px] px-5"
        >
          + Nouveau ticket
        </Link>
      </div>

      {/* Liste des tickets */}
      {tickets.length === 0 ? (
        <div className="card py-16 text-center">
          <span className="text-4xl mb-3 block">🎉</span>
          <p className="text-slate-800 font-semibold">Aucune demande en cours</p>
          <p className="text-slate-400 text-sm mt-1">
            Tout va bien ! Si vous rencontrez un problème, créez un ticket.
          </p>
          <Link
            href="/dashboard/support/new"
            className="btn-primary mt-5 inline-flex min-h-[44px] px-6"
          >
            Créer mon premier ticket
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-3.5 px-5">Sujet</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Catégorie</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Urgence</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <Link
                        href={`/dashboard/support/${t.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                      >
                        {t.subject}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t.replies.length} message{t.replies.length !== 1 ? "s" : ""}
                      </p>
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
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
