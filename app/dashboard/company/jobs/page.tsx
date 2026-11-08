import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import { Job } from "@/lib/models/types";
import { deleteJob, changeJobStatus } from "@/app/actions";
import { getCompanyJobActivities, formatActivityAction, formatRelativeTime } from "@/lib/jobs/activities";
import JobActionButton from "./components/JobActionButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  published: "Publiée",
  closed: "Clôturée",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "badge-yellow",
  published: "badge-green",
  closed: "badge-gray",
};

interface PageProps {
  searchParams: {
    status?: string;
    q?: string;
    error?: string;
    msg?: string;
    success?: string;
  };
}

export default async function CompanyJobsPage({ searchParams }: PageProps) {
  const sessionData = await getSessionUser();

  if (!sessionData) redirect("/login");
  if (sessionData.user.role !== "entreprise") {
    redirect("/access-denied");
  }

  const db = await getDb();
  const statusFilter = searchParams.status || "all";
  const searchQuery = searchParams.q?.trim() || "";

  // Build query
  const query: any = { company_id: sessionData.user.id };
  
  if (statusFilter !== "all") {
    query.status = statusFilter;
  }

  if (searchQuery) {
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { title: regex },
      { location: regex },
      { description: regex },
    ];
  }

  const jobs = await db
    .collection<Job>("jobs")
    .find(query)
    .sort({ created_at: -1 })
    .toArray();

  // Get statistics
  const allJobs = await db
    .collection<Job>("jobs")
    .find({ company_id: sessionData.user.id })
    .toArray();

  const stats = {
    total: allJobs.length,
    published: allJobs.filter((j) => j.status === "published").length,
    draft: allJobs.filter((j) => j.status === "draft").length,
    closed: allJobs.filter((j) => j.status === "closed").length,
  };

  // Get recent activities
  const activities = await getCompanyJobActivities(sessionData.user.id, 10);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Error/Success Messages */}
      {searchParams.error === "validation" && searchParams.msg && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-600 text-xl flex-shrink-0">⚠️</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900">Impossible de publier l&apos;offre</p>
            <p className="text-amber-700 mt-1">{decodeURIComponent(searchParams.msg)}</p>
          </div>
        </div>
      )}

      {searchParams.success === "status_changed" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-emerald-600 text-xl flex-shrink-0">✓</span>
          <p className="text-sm text-emerald-800 font-medium">Le statut de l&apos;offre a été modifié avec succès</p>
        </div>
      )}

      {searchParams.success === "saved" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-emerald-600 text-xl flex-shrink-0">✓</span>
          <p className="text-sm text-emerald-800 font-medium">L&apos;offre a été enregistrée avec succès</p>
        </div>
      )}

      {searchParams.success === "published" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-emerald-600 text-xl flex-shrink-0">✓</span>
          <p className="text-sm text-emerald-800 font-medium">L&apos;offre a été publiée avec succès</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des offres</h1>
          <p className="text-slate-500 text-sm mt-1">
            Créez, modifiez et gérez vos offres d&apos;emploi
          </p>
        </div>
        <Link href="/dashboard/company/jobs/new" className="btn-primary">
          <PlusIcon />
          Nouvelle offre
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total",
            value: stats.total,
            color: "text-slate-900",
            bg: "bg-slate-50",
            icon: <BriefcaseIcon />,
          },
          {
            label: "Publiées",
            value: stats.published,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            icon: <CheckCircleIcon />,
          },
          {
            label: "Brouillons",
            value: stats.draft,
            color: "text-amber-600",
            bg: "bg-amber-50",
            icon: <FileTextIcon />,
          },
          {
            label: "Clôturées",
            value: stats.closed,
            color: "text-slate-400",
            bg: "bg-slate-100",
            icon: <ArchiveIcon />,
          },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {s.label}
              </span>
              <span className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center text-slate-600`}>
                {s.icon}
              </span>
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Jobs List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { value: "all", label: "Toutes" },
                  { value: "published", label: "Publiées" },
                  { value: "draft", label: "Brouillons" },
                  { value: "closed", label: "Clôturées" },
                ].map((filter) => (
                  <Link
                    key={filter.value}
                    href={`/dashboard/company/jobs?status=${filter.value}${searchQuery ? `&q=${searchQuery}` : ""}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === filter.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter.label}
                  </Link>
                ))}
              </div>

              {/* Search */}
              <form method="GET" action="/dashboard/company/jobs" className="flex-1">
                <input type="hidden" name="status" value={statusFilter} />
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Rechercher..."
                  className="w-full input-field text-xs py-2"
                />
              </form>
            </div>
          </div>

          {/* Jobs List */}
          <div className="card overflow-hidden divide-y divide-slate-100">
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap mb-2">
                        <Link
                          href={`/dashboard/company/jobs/${job.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {job.title}
                        </Link>
                        <span className={STATUS_STYLE[job.status]}>
                          {STATUS_LABEL[job.status]}
                        </span>
                        {job.category && (
                          <span className="badge-blue">{job.category}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap mb-3">
                        <span className="flex items-center gap-1">
                          <PinIcon />
                          {job.location}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{job.type}</span>
                        {job.work_mode && (
                          <>
                            <span>•</span>
                            <span>{getWorkModeLabel(job.work_mode)}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(job.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      {job.skills && job.skills.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {job.skills.slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 4 && (
                            <span className="text-xs text-slate-400">
                              +{job.skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {job.validation_errors && job.validation_errors.length > 0 && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                          <span className="font-semibold">⚠️ Validation requise:</span>{" "}
                          {job.validation_errors[0]}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {job.status === "draft" && (
                        <JobActionButton
                          action={changeJobStatus.bind(null, job.id, "published")}
                          label="Publier"
                          variant="publish"
                          title="Publier l'offre"
                        />
                      )}
                      {job.status === "published" && (
                        <JobActionButton
                          action={changeJobStatus.bind(null, job.id, "closed")}
                          label="Clôturer"
                          variant="close"
                          title="Clôturer l'offre"
                        />
                      )}
                      {job.status === "closed" && (
                        <JobActionButton
                          action={changeJobStatus.bind(null, job.id, "published")}
                          label="Réouvrir"
                          variant="reopen"
                          title="Réouvrir l'offre"
                        />
                      )}
                      <Link
                        href={`/dashboard/company/jobs/${job.id}`}
                        className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all"
                      >
                        Modifier
                      </Link>
                      <JobActionButton
                        action={deleteJob.bind(null, job.id)}
                        label="Supprimer"
                        variant="delete"
                        title="Supprimer l'offre"
                      />
                    </div>
                  </div>

                  {(job.views_count || 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <EyeIcon />
                        {job.views_count || 0} vue{(job.views_count || 0) > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                  <BriefcaseIcon />
                </div>
                <p className="text-slate-800 font-bold text-base">
                  {searchQuery ? "Aucun résultat" : "Aucune offre"}
                </p>
                <p className="text-slate-500 text-sm mt-1 mb-6">
                  {searchQuery
                    ? "Essayez avec d'autres mots-clés"
                    : "Commencez par créer votre première offre"}
                </p>
                {!searchQuery && (
                  <Link href="/dashboard/company/jobs/new" className="btn-primary">
                    <PlusIcon /> Créer une offre
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Activity Timeline Sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClockIcon />
              <h2 className="font-bold text-slate-900 text-sm">Activité récente</h2>
            </div>

            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="text-xs">
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
            ) : (
              <p className="text-slate-400 text-xs">Aucune activité récente</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h2 className="font-bold text-slate-900 text-sm mb-4">Actions rapides</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/company/jobs/new"
                className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
              >
                <PlusIcon />
                Nouvelle offre
              </Link>
              <Link
                href="/dashboard/company"
                className="flex items-center gap-2 text-xs text-slate-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
              >
                <BuildingIcon />
                Profil entreprise
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getWorkModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    remote: "Télétravail",
    hybrid: "Hybride",
    onsite: "Sur site",
  };
  return labels[mode] || mode;
}

// Icons
function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  );
}
