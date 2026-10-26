import Link from "next/link";
import { redirect } from "next/navigation";
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

const SIZE_LABEL: Record<string, string> = {
  "1-10": "1 à 10 employés",
  "11-50": "11 à 50 employés",
  "51-200": "51 à 200 employés",
  "201-500": "201 à 500 employés",
  "500+": "Plus de 500 employés",
};

export default async function CompanyDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", user.id)
    .order("created_at", { ascending: false });

  const stats = {
    total: jobs?.length ?? 0,
    published: jobs?.filter((j) => j.status === "published").length ?? 0,
    draft: jobs?.filter((j) => j.status === "draft").length ?? 0,
    closed: jobs?.filter((j) => j.status === "closed").length ?? 0,
  };

  const companyStatus = company?.status ?? "pending";

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto animate-fade-in">
      {/* ── Topbar section ────────────────────────────────────────── */}
      <div className="card p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-sm shadow-blue-500/20">
            {company?.name?.charAt(0)?.toUpperCase() ?? "E"}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">
                {company?.name ?? "Mon entreprise"}
              </h1>
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
                  ? "✓ Vérifiée"
                  : companyStatus === "rejected"
                  ? "✗ Refusée"
                  : "⏳ En attente de vérification"}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              {[company?.sector, company?.city].filter(Boolean).join(" · ") ||
                "Gérez vos offres et votre profil recruteur"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/company/edit"
            className="btn-secondary text-xs sm:text-sm py-2.5 px-4"
          >
            <EditIcon />
            Modifier le profil
          </Link>
          <Link
            href="/dashboard/jobs/new"
            className="btn-primary text-xs sm:text-sm py-2.5 px-4"
            id="add-job-btn"
          >
            <PlusIcon />
            Publier une offre
          </Link>
        </div>
      </div>

      {/* ── Company Status Banner if pending ────────────────────────── */}
      {companyStatus === "pending" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:p-5 flex items-start gap-3.5 text-amber-900 shadow-sm">
          <span className="text-2xl flex-shrink-0 leading-none mt-0.5">⏳</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-950">
              Votre entreprise est en cours de vérification par notre équipe.
            </p>
            <p className="text-amber-800/90 mt-0.5">
              Vos offres apparaîtront publiquement une fois la vérification complétée. En attendant, vous pouvez compléter votre profil et créer des offres en brouillon.
            </p>
          </div>
        </div>
      )}

      {companyStatus === "rejected" && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 sm:p-5 flex items-start gap-3.5 text-red-900 shadow-sm">
          <span className="text-2xl flex-shrink-0 leading-none mt-0.5">⚠️</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-red-950">
              Votre dossier d&apos;entreprise a été refusé.
            </p>
            {company?.rejection_reason && (
              <p className="text-red-800/90 mt-0.5">
                <span className="font-medium">Motif :</span> {company.rejection_reason}
              </p>
            )}
            <p className="text-red-700 text-xs mt-1.5">
              Veuillez mettre à jour les informations de votre profil pour soumettre à nouveau votre demande de validation.
            </p>
          </div>
          <Link
            href="/dashboard/company/edit"
            className="text-xs font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
          >
            Corriger mon profil
          </Link>
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total offres",
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

      {/* ── Company Profile Section ───────────────────────────────── */}
      <div className="card p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Profil de l&apos;entreprise</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Informations détaillées associées à votre compte recruteur
            </p>
          </div>
          <Link
            href="/dashboard/company/edit"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg transition-colors"
          >
            <EditIcon />
            Modifier
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Nom officiel
            </span>
            <p className="text-slate-900 font-semibold text-sm">
              {company?.name || "Non renseigné"}
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Secteur d&apos;activité
            </span>
            <div className="mt-0.5">
              {company?.sector ? (
                <span className="badge-blue">{company.sector}</span>
              ) : (
                <span className="text-slate-400 text-sm italic">Non renseigné</span>
              )}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Taille de l&apos;entreprise
            </span>
            <p className="text-slate-700 text-sm">
              {company?.size ? SIZE_LABEL[company.size] ?? company.size : "Non renseigné"}
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Ville / Siège
            </span>
            <p className="text-slate-700 text-sm flex items-center gap-1.5">
              <PinIcon />
              {company?.city || "Non renseigné"}
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Site web
            </span>
            {company?.website ? (
              <a
                href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline text-sm truncate block font-medium"
              >
                {company.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span className="text-slate-400 text-sm italic">Non renseigné</span>
            )}
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Téléphone
            </span>
            <p className="text-slate-700 text-sm">
              {company?.phone || "Non renseigné"}
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Page LinkedIn
            </span>
            {company?.linkedin_url ? (
              <a
                href={company.linkedin_url.startsWith("http") ? company.linkedin_url : `https://${company.linkedin_url}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline text-sm truncate block font-medium"
              >
                Voir la page LinkedIn ↗
              </a>
            ) : (
              <span className="text-slate-400 text-sm italic">Non renseigné</span>
            )}
          </div>
        </div>

        {/* Description full width */}
        <div className="pt-2 border-t border-slate-100">
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Description de l&apos;entreprise
          </span>
          {company?.description ? (
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50/70 rounded-xl p-4 border border-slate-100">
              {company.description}
            </p>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 text-slate-400 text-sm italic border border-slate-100 flex items-center justify-between">
              <span>Aucune description renseignée pour le moment.</span>
              <Link
                href="/dashboard/company/edit"
                className="text-xs text-blue-600 hover:underline font-semibold not-italic"
              >
                + Ajouter une description
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Jobs List Section ─────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Offres d&apos;emploi</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Toutes les offres créées par votre organisation
            </p>
          </div>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3.5 py-2 rounded-lg transition-colors"
          >
            <PlusIcon />
            Nouvelle offre
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50/60 transition-colors gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-sm"
                    >
                      {job.title}
                    </Link>
                    <span className={STATUS_STYLE[job.status] ?? "badge-gray"}>
                      {STATUS_LABEL[job.status] ?? job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-600">
                      <PinIcon />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-slate-700">{job.type}</span>
                    <span>•</span>
                    <span>
                      Créée le{" "}
                      {new Date(job.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <Link
                    href={`/dashboard/jobs/${job.id}`}
                    className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all"
                  >
                    Modifier
                  </Link>
                  <form action={deleteJob.bind(null, job.id)}>
                    <button
                      type="submit"
                      className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 transition-all"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                <BriefcaseIcon />
              </div>
              <p className="text-slate-800 font-bold text-base">Aucune offre publiée</p>
              <p className="text-slate-500 text-sm mt-1 mb-6 max-w-sm">
                Publiez votre première offre d&apos;emploi pour commencer à recevoir des candidatures qualifiées.
              </p>
              <Link href="/dashboard/jobs/new" className="btn-primary">
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

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}
