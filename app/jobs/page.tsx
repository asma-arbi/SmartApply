import Link from "next/link";
import { getDb } from "@/lib/mongodb";
import { Job } from "@/lib/models/types";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    q?: string;
    location?: string;
    type?: string;
    category?: string;
    work_mode?: string;
    experience?: string;
  };
}

export default async function JobsListingPage({ searchParams }: PageProps) {
  const sessionData = await getSessionUser();
  const user = sessionData?.user;

  const db = await getDb();

  // Build query based on filters
  const query: any = { status: "published" };

  if (searchParams.q) {
    const regex = new RegExp(searchParams.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { title: regex },
      { description: regex },
      { location: regex },
    ];
  }

  if (searchParams.location) {
    query.location = new RegExp(searchParams.location, "i");
  }

  if (searchParams.type) {
    query.type = searchParams.type;
  }

  if (searchParams.category) {
    query.category = searchParams.category;
  }

  if (searchParams.work_mode) {
    query.work_mode = searchParams.work_mode;
  }

  if (searchParams.experience) {
    query.experience_level = searchParams.experience;
  }

  // Fetch jobs with company info
  const pipeline: any[] = [
    { $match: query },
    { $sort: { published_at: -1, created_at: -1 } },
    {
      $lookup: {
        from: "companies",
        localField: "company_id",
        foreignField: "id",
        as: "companies",
      },
    },
    {
      $unwind: {
        path: "$companies",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const jobs = await db.collection<Job>("jobs").aggregate(pipeline).toArray();

  // Get filter counts
  const allPublished = await db.collection("jobs").find({ status: "published" }).toArray();
  
  const locationCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  allPublished.forEach((job: any) => {
    if (job.location) {
      const loc = job.location.split(",")[0].trim();
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
    if (job.type) typeCounts[job.type] = (typeCounts[job.type] || 0) + 1;
    if (job.category) categoryCounts[job.category] = (categoryCounts[job.category] || 0) + 1;
  });

  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-slate-900 font-bold text-sm leading-none">SmartApply</p>
              <p className="text-blue-600 text-[10px] leading-none">Tunisia</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <Link
                href={
                  user.role === "admin"
                    ? "/dashboard/admin"
                    : user.role === "entreprise"
                    ? "/dashboard/company"
                    : "/dashboard/candidate"
                }
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                Mon espace
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  Connexion
                </Link>
                <Link href="/register" className="btn-primary py-2 px-4 text-xs">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Header with stats */}
      <div className="bg-white border-b border-slate-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Offres d&apos;emploi</h1>
          <p className="text-slate-600">
            {jobs.length} offre{jobs.length > 1 ? "s" : ""} trouvée{jobs.length > 1 ? "s" : ""}
          </p>

          {/* Category Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              {
                label: "Tous",
                count: allPublished.length,
                icon: "📋",
                href: "/jobs",
              },
              {
                label: "Temps plein",
                count: typeCounts["Temps plein"] || typeCounts["CDI"] || 0,
                icon: "💼",
                href: "/jobs?type=Temps plein",
              },
              {
                label: "Stages",
                count: (typeCounts["Stage"] || 0) + (typeCounts["Stage PFE"] || 0),
                icon: "🎓",
                href: "/jobs?type=Stage",
              },
              {
                label: "Télétravail",
                count: allPublished.filter((j: any) => j.work_mode === "remote").length,
                icon: "🏠",
                href: "/jobs?work_mode=remote",
              },
            ].map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-slate-900">{stat.count}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <aside className="lg:col-span-1">
            <div className="card p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">Filtres</h2>
                {Object.keys(searchParams).some((k) => k !== "q") && (
                  <Link
                    href="/jobs"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Effacer tout
                  </Link>
                )}
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Recherche
                  </label>
                  <form method="GET" action="/jobs">
                    <input
                      name="q"
                      defaultValue={searchParams.q}
                      placeholder="Poste, compétence..."
                      className="w-full input-field text-sm"
                    />
                  </form>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Localisation
                  </label>
                  <div className="space-y-2">
                    {topLocations.map(([location, count]) => (
                      <Link
                        key={location}
                        href={`/jobs?location=${encodeURIComponent(location)}`}
                        className={`flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-slate-50 ${
                          searchParams.location === location ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600"
                        }`}
                      >
                        <span>{location}</span>
                        <span className="text-xs text-slate-400">({count})</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Contract Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Type de contrat
                  </label>
                  <div className="space-y-2">
                    {Object.entries(typeCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <Link
                          key={type}
                          href={`/jobs?type=${encodeURIComponent(type)}`}
                          className={`flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-slate-50 ${
                            searchParams.type === type ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600"
                          }`}
                        >
                          <span>{type}</span>
                          <span className="text-xs text-slate-400">({count})</span>
                        </Link>
                      ))}
                  </div>
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Niveau d&apos;expérience
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "internship", label: "Stage" },
                      { value: "junior", label: "Débutant (0-2 ans)" },
                      { value: "mid", label: "Intermédiaire (2-5 ans)" },
                      { value: "senior", label: "Senior (5+ ans)" },
                    ].map((exp) => (
                      <Link
                        key={exp.value}
                        href={`/jobs?experience=${exp.value}`}
                        className={`block text-sm py-1.5 px-2 rounded hover:bg-slate-50 ${
                          searchParams.experience === exp.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600"
                        }`}
                      >
                        {exp.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content - Job Listings */}
          <main className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{jobs.length}</span> offres trouvées
              </p>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option>Plus récentes</option>
                <option>Plus anciennes</option>
              </select>
            </div>

            <div className="space-y-4">
              {jobs.length > 0 ? (
                jobs.map((job) => {
                  const company = job.companies as any;
                  const companyInitial = company?.name?.charAt(0)?.toUpperCase() || "?";

                  return (
                    <div key={job.id} className="card p-5 hover:shadow-md transition-all group">
                      <div className="flex gap-4">
                        {/* Company Logo */}
                        <div className="flex-shrink-0">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm">
                            {companyInitial}
                          </div>
                        </div>

                        {/* Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <Link
                                href={`/jobs/${job.id}`}
                                className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors group-hover:text-blue-600"
                              >
                                {job.title}
                              </Link>
                              <p className="text-sm text-slate-600 mt-0.5">{company?.name}</p>
                            </div>
                            <button className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
                              <HeartIcon />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-slate-500 mb-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPinIcon />
                              {job.location}
                            </span>
                            {job.work_mode && (
                              <>
                                <span>•</span>
                                <span>{getWorkModeLabel(job.work_mode)}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={getTypeBadgeClass(job.type)}>{job.type}</span>
                              {job.skills && job.skills.slice(0, 3).map((skill) => (
                                <span key={skill} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                  {skill}
                                </span>
                              ))}
                              {job.skills && job.skills.length > 3 && (
                                <span className="text-xs text-slate-400">
                                  +{job.skills.length - 3}
                                </span>
                              )}
                            </div>

                            <Link href={`/jobs/${job.id}`} className="btn-primary px-5 py-2 text-sm flex-shrink-0">
                              Postuler
                            </Link>
                          </div>

                          <div className="mt-3 text-xs text-slate-400">
                            Publié {getRelativeTime(job.published_at || job.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="card p-16 text-center">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune offre trouvée</h3>
                  <p className="text-slate-500 mb-6">
                    Essayez de modifier vos critères de recherche
                  </p>
                  <Link href="/jobs" className="btn-primary">
                    Voir toutes les offres
                  </Link>
                </div>
              )}
            </div>
          </main>
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

function getTypeBadgeClass(type: string): string {
  const classes: Record<string, string> = {
    Stage: "badge-indigo",
    "Stage PFE": "badge-indigo",
    "Temps plein": "badge-green",
    CDI: "badge-green",
    CDD: "badge-blue",
    Freelance: "badge-yellow",
  };
  return classes[type] || "badge-gray";
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function MapPinIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
