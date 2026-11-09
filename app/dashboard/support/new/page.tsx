import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import NewTicketForm from "../components/NewTicketForm";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?revoked=1");
  if (session.user.role === "admin") redirect("/dashboard/admin/support");

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/dashboard/support" className="hover:text-blue-600 transition-colors">
          ← Mes tickets
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium">Nouveau ticket</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Créer un ticket</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Décrivez votre problème et notre équipe vous répondra dans les plus brefs délais.
        </p>
      </div>

      <NewTicketForm />
    </div>
  );
}
