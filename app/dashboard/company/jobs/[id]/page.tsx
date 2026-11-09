import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import { Job } from "@/lib/models/types";
import JobForm from "../components/JobForm";
import { getJobActivities, formatActivityAction, formatRelativeTime } from "@/lib/jobs/activities";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: {
    error?: string;
    msg?: string;
    success?: string;
  };
}

export default async function EditJobPage({ params, searchParams }: PageProps) {
  const sessionData = await getSessionUser();

  if (!sessionData) redirect("/login");
  if (sessionData.user.role !== "entreprise") {
    redirect("/access-denied");
  }

  const db = await getDb();
  const job = await db.collection<Job>("jobs").findOne({
    id: params.id,
    company_id: sessionData.user.id,
  });

  if (!job) {
    redirect("/dashboard/company/jobs");
  }

  // Get activity timeline for this job
  const activities = await getJobActivities(params.id, 10);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <a href="/dashboard/company" className="text-slate-500 hover:text-slate-700">
          Entreprise
        </a>
        <span className="text-slate-300">/</span>
        <a href="/dashboard/company/jobs" className="text-slate-500 hover:text-slate-700">
          Offres
        </a>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium truncate max-w-md">
          {job.title || "Modifier l'offre"}
        </span>
      </nav>

      {/* Error/Success Messages */}
      {searchParams.error === "validation" && searchParams.msg && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <span className="text-amber-600 text-xl flex-shrink-0">⚠️</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900">Impossible de publier l&apos;offre</p>
            <p className="text-amber-700 mt-1">{decodeURIComponent(searchParams.msg)}</p>
          </div>
        </div>
      )}

      {searchParams.success === "saved" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <span className="text-emerald-600 text-xl flex-shrink-0">✓</span>
          <p className="text-sm text-emerald-800 font-medium">L&apos;offre a été enregistrée avec succès</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Modifier l&apos;offre</h1>
            <p className="text-slate-500 text-sm mt-1">
              Mettez à jour les informations de votre offre
            </p>
          </div>

          <JobForm job={job} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Status Card */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 text-sm mb-4">Statut de l&apos;offre</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Statut actuel</span>
                <span className={getStatusBadgeClass(job.status)}>
                  {getStatusLabel(job.status)}
                </span>
              </div>

              {job.created_at && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Créée le</span>
                  <span className="text-slate-700">
                    {new Date(job.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}

              {job.published_at && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Publiée le</span>
                  <span className="text-slate-700">
                    {new Date(job.published_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}

              {job.views_count !== undefined && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Vues</span>
                  <span className="text-slate-700 font-medium">{job.views_count || 0}</span>
                </div>
              )}
            </div>

            {job.validation_errors && job.validation_errors.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-900 mb-2">
                  ⚠️ Erreurs de validation
                </p>
                <ul className="text-xs text-amber-800 space-y-1">
                  {job.validation_errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          {activities.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <ClockIcon />
                Historique
              </h2>

              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="text-xs border-l-2 border-slate-200 pl-3">
                    <p className="text-slate-700">
                      <span className="font-semibold">{activity.user_name}</span>{" "}
                      {formatActivityAction(activity.action)}
                    </p>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 text-sm mb-4">Actions</h2>
            <div className="space-y-2">
              <a
                href={`/jobs/${job.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
              >
                <EyeIcon />
                Prévisualiser
              </a>
              <a
                href="/dashboard/company/jobs"
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
              >
                <ArrowLeftIcon />
                Retour à la liste
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    published: "Publiée",
    closed: "Clôturée",
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    draft: "badge-yellow",
    published: "badge-green",
    closed: "badge-gray",
  };
  return classes[status] || "badge-gray";
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
