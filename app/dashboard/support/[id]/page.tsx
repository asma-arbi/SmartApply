import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getUserTicketById } from "@/lib/support/db";
import { actionReopenTicket } from "@/app/dashboard/support/actions";
import TicketStatusBadge from "../components/TicketStatusBadge";
import TicketUrgencyBadge from "../components/TicketUrgencyBadge";
import TicketCategoryBadge from "../components/TicketCategoryBadge";
import ReplyForm from "../components/ReplyForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function TicketDetailPage({ params }: PageProps) {
  // Auth
  const session = await getSessionUser();
  if (!session) redirect("/login?revoked=1");
  if (session.user.role === "admin") redirect(`/dashboard/admin/support/${params.id}`);

  // Ownership check côté serveur
  const ticket = await getUserTicketById(params.id, session.user.id);
  if (!ticket) notFound();

  const canReply = ticket.status !== "clos";
  const canReopen = ticket.status === "resolu";

  async function handleReopen(_fd: FormData) {
    "use server";
    await actionReopenTicket(params.id);
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard/support" className="hover:text-blue-600 transition-colors">
          ← Mes tickets
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium line-clamp-1">{ticket.subject}</span>
      </div>

      {/* En-tête du ticket */}
      <div className="card p-5 space-y-3">
        <div className="flex flex-wrap items-start gap-2 justify-between">
          <h1 className="text-lg font-bold text-slate-900 flex-1 min-w-0">
            {ticket.subject}
          </h1>
          <TicketStatusBadge status={ticket.status} />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <TicketCategoryBadge category={ticket.category} aiClassified={ticket.aiClassified} />
          <TicketUrgencyBadge urgency={ticket.urgency} />
          {ticket.aiClassified && (
            <span className="text-[10px] text-slate-400 ml-1">— Classification générée par IA</span>
          )}
        </div>

        <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
          {ticket.description}
        </p>

        <p className="text-xs text-slate-400">
          Créé le{" "}
          {new Date(ticket.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Conversation */}
      {ticket.replies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Conversation ({ticket.replies.length} message{ticket.replies.length > 1 ? "s" : ""})
          </h2>
          {ticket.replies.map((reply, i) => {
            const isAdmin = reply.authorRole === "admin";
            return (
              <div
                key={i}
                className={[
                  "card p-4 space-y-1.5",
                  isAdmin ? "border-blue-100 bg-blue-50/40" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`font-semibold ${
                      isAdmin ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {isAdmin ? "🛡️ Support SmartApply" : "Vous"}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400">
                    {new Date(reply.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {reply.body}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Zone d'action */}
      {canReopen && (
        <div className="card p-4 bg-emerald-50/60 border-emerald-100">
          <p className="text-sm text-emerald-800 mb-3">
            Ce ticket est marqué comme résolu. S&apos;il y a encore un problème, vous pouvez le réouvrir.
          </p>
          <form action={handleReopen}>
            <button
              type="submit"
              className="btn-secondary text-sm min-h-[40px] px-5"
            >
              Réouvrir le ticket
            </button>
          </form>
        </div>
      )}

      {ticket.status === "clos" && (
        <div className="card p-4 bg-slate-50 border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Ce ticket est clos. Pour un nouveau problème, créez un{" "}
            <Link href="/dashboard/support/new" className="text-blue-600 hover:underline">
              nouveau ticket
            </Link>
            .
          </p>
        </div>
      )}

      {canReply && !canReopen && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Ajouter un message</h2>
          <ReplyForm ticketId={ticket.id} />
        </div>
      )}
    </div>
  );
}
