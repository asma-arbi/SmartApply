import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import { canPublishJob, FREE_MAX_PUBLISHED_JOBS } from "@/lib/billing/plans";
import JobForm from "../components/JobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const sessionData = await getSessionUser();

  if (!sessionData) redirect("/login");
  if (sessionData.user.role !== "entreprise") {
    redirect("/access-denied");
  }

  const userId = sessionData.user.id;

  // ── Vérification contrainte plan gratuit ──────────────────────────────────
  const db = await getDb();
  const publishedCount = await db
    .collection("jobs")
    .countDocuments({ company_id: userId, status: "published" });

  const { allowed, reason } = await canPublishJob(userId, publishedCount);

  // Si l'entreprise ne peut pas publier → bloquer avec message clair
  if (!allowed) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
        <div className="card p-8 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Limite du plan gratuit atteinte
            </h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              {reason}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left space-y-2">
            <p className="font-semibold">📋 Plan Gratuit actuel :</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>{FREE_MAX_PUBLISHED_JOBS} offre publiée maximum</li>
              <li>Clôturez une offre existante pour en publier une nouvelle</li>
            </ul>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800 text-left space-y-2">
            <p className="font-semibold">⭐ Plan Pro — Offres illimitées :</p>
            <ul className="list-disc list-inside space-y-1 text-indigo-700">
              <li>Publiez autant d&apos;offres que vous souhaitez</li>
              <li>Accès prioritaire aux candidats qualifiés</li>
              <li>Conseiller IA personnalisé</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/dashboard/company/abonnement"
              className="btn-primary min-h-[44px] px-6 inline-flex items-center justify-center gap-2"
            >
              ⭐ Passer au plan Pro
            </Link>
            <Link
              href="/dashboard/company/jobs"
              className="btn-secondary min-h-[44px] px-5 inline-flex items-center justify-center"
            >
              ← Mes offres
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Créer une offre d&apos;emploi</h1>
        <p className="text-slate-500 text-sm mt-1">
          Remplissez les informations de votre offre
        </p>
        {/* Afficher l'usage si plan gratuit */}
        <p className="text-xs text-slate-400 mt-2">
          Offres publiées : {publishedCount} / {FREE_MAX_PUBLISHED_JOBS} (plan gratuit)
          {" — "}
          <Link href="/dashboard/company/abonnement" className="text-indigo-600 hover:underline">
            Passer au Pro pour des offres illimitées
          </Link>
        </p>
      </div>

      <JobForm />
    </div>
  );
}
