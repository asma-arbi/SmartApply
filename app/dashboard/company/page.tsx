import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteJob } from "@/app/actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  published: "Publiée",
  closed: "Clôturée",
};
const STATUS_STYLE: Record<string, string> = {
  draft: "badge-gray",
  published: "badge-green",
  closed: "badge-red",
};

export default async function CompanyDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", user!.id)
    .order("created_at", { ascending: false });

  const stats = {
    total: jobs?.length ?? 0,
    published: jobs?.filter((j) => j.status === "published").length ?? 0,
    draft: jobs?.filter((j) => j.status === "draft").length ?? 0,
    closed: jobs?.filter((j) => j.status === "closed").length ?? 0,
  };

  const companyStatus = company?.status ?? "pending";

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {company?.name ?? "Mon espace entreprise"}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span
              className={
                companyStatus === "verified"
                  ? "badge-green"
                  : companyStatus === "rejected"
                  ? "badge-red"
                  : "badge-yellow"
              }
            >
              {companyStatus === "verified"
                ? "✓ Entreprise vérifiée"
                : companyStatus === "rejected"
                ? "✗ Refusée"
                : "⏳ En attente de vérification"}
            </span>
          </div>
          {companyStatus === "rejected" && company?.rejection_reason && (
            <p className="text-red-600 text-sm mt-2">
              Motif : {company.rejection_reason}
            </p>
          )}
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="btn-primary flex-shrink-0"
          id="add-job-btn"
        >
          <PlusIcon />
          Publier une offre
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-slate-700" },
          { label: "Publiées", value: stats.published, color: "text-emerald-600" },
          { label: "Brouillons", value: stats.draft, color: "text-amber-600" },
          { label: "Clôturées", value: stats.closed, color: "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
              {s.label}
            </p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Jobs list */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Mes offres d&apos;emploi</h2>
          <Link
            href="/dashboard/jobs/new"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Nouvelle offre
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-sm"
                    >
                      {job.title}
                    </Link>
                    <span className={STATUS_STYLE[job.status] ?? "badge-gray"}>
                      {STATUS_LABEL[job.status] ?? job.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {job.location} · {job.type} ·{" "}
                    {new Date(job.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Modifier
                  </Link>
                  <form action={deleteJob.bind(null, job.id)}>
                    <button
                      type="submit"
                      className="text-xs font-medium text-slate-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <EmptyJobsIcon />
              <p className="text-slate-700 font-semibold mt-4">Aucune offre publiée</p>
              <p className="text-slate-400 text-sm mt-1 mb-6">
                Publiez votre première offre pour commencer à recevoir des candidatures.
              </p>
              <Link href="/dashboard/jobs/new" className="btn-primary px-6">
                <PlusIcon /> Publier une offre
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function EmptyJobsIcon() {
  return (
    <svg className="w-14 h-14 text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
