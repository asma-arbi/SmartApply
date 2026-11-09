import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getTicketById } from "@/lib/support/db";
import { adminActionReply, adminActionChangeStatus } from "../actions";
import TicketStatusBadge from "@/app/dashboard/support/components/TicketStatusBadge";
import TicketUrgencyBadge from "@/app/dashboard/support/components/TicketUrgencyBadge";
import TicketCategoryBadge from "@/app/dashboard/support/components/TicketCategoryBadge";
import AdminReplyForm from "./components/AdminReplyForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function AdminTicketDetailPage({ params }: PageProps) {
  const session = await getSessionUser();
  if (!session) redirect("/login?revoked=1");
  if (session.user.role !== "admin") redirect("/access-denied");

  const ticket = await getTicketById(params.id);
  if (!ticket) notFound();

  async function handleStatusChange(fd: FormData) {
    "use server";
    const status = fd.get("status") as string;
    await adminActionChangeStatus(params.id, status);
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard/admin/support" className="hover:text-blue-600 transition-colors">
          ← Tickets support
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
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ticket.userRole === "entreprise"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                : "bg-blue-50 text-blue-700 border border-blue-100"
            }`}
          >
            {ticket.userRole === "entreprise" ? "🏢 Entreprise" : "👤 Candidat"}
          </span>
          {ticket.aiClassified && (
            <span className="text-[10px] text-slate-400 ml-1">— Classification IA</span>
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

      {/* Actions rapides de statut */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Changer le statut</h2>
        <form action={handleStatusChange} className="flex flex-wrap gap-2">
          {["ouvert", "en_cours", "resolu", "clos"].map((s) => (
            <button
              key={s}
              type="submit"
              name="status"
              value={s}
              className={`text-xs px-4 py-2 rounded-lg font-medium transition-colors min-h-[36px] ${
                ticket.status === s
                  ? "bg-blue-600 text-white cursor-default"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              disabled={ticket.status === s}
            >
              {s === "ouvert" ? "🔵 Ouvert" : s === "en_cours" ? "🟡 En cours" : s === "resolu" ? "🟢 Résolu" : "⚫ Clos"}
            </button>
          ))}
        </form>
        <p className="text-xs text-slate-400">
          ⚠ La réclamation doit être approuvée (résolue) par l&apos;admin avant de clore le ticket.
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
                  isAdmin ? "border-amber-100 bg-amber-50/40" : "border-slate-100",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`font-semibold ${
                      isAdmin ? "text-amber-700" : "text-slate-700"
                    }`}
                  >
                    {isAdmin ? "🛡️ Admin" : reply.authorRole === "entreprise" ? "🏢 Entreprise" : "👤 Candidat"}
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

      {/* Formulaire de réponse admin */}
      {ticket.status !== "clos" && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">
            Répondre au ticket
          </h2>
          <AdminReplyForm ticketId={ticket.id} currentStatus={ticket.status} />
        </div>
      )}

      {ticket.status === "clos" && (
        <div className="card p-4 bg-slate-50 text-center">
          <p className="text-sm text-slate-500">Ce ticket est clos.</p>
        </div>
      )}
    </div>
  );
}
