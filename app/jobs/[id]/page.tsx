import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/auth/session";
import { Job, Company } from "@/lib/models/types";
import { EXPERIENCE_LEVELS, WORK_MODES } from "@/lib/jobs/validation";
import ApplyAction from "./ApplyAction";

export const dynamic = "force-dynamic";

type JobView = Job & Record<string, any>;
type CompanyView = Company & Record<string, any>;

function timeAgo(value?: string | Date | null): string {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Publiée à l'instant";
  if (h < 24) return `Publiée il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `Publiée il y a ${d} jour${d > 1 ? "s" : ""}`;
}

function salaryLabel(job: JobView): string {
  const { salary_min: min, salary_max: max, currency = "TND" } = job;
  if (min && max) return `${min} – ${max} ${currency}`;
  if (min) return `À partir de ${min} ${currency}`;
  if (max) return `Jusqu'à ${max} ${currency}`;
  return "Non spécifié";
}

function CheckList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

export default async function JobPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const db = await getDb();
  const job = (await db.collection<Job>("jobs").findOne({ id: params.id })) as JobView | null;
  if (!job) notFound();

  const session = await getSessionUser();
  const viewer = session?.user ?? null;

  const canSeeUnpublished =
    !!viewer && (viewer.role === "admin" || viewer.id === job.company_id);
  if (job.status !== "published" && !canSeeUnpublished) notFound();

  const company = (job.company_id
    ? await db.collection<Company>("companies").findOne({ id: job.company_id })
    : null) as CompanyView | null;

  const companyName = company?.name ?? "Entreprise";
  const tab = searchParams.tab === "company" ? "company" : "overview";

  const workMode = WORK_MODES.find((m) => m.value === job.work_mode)?.label;
  const level = EXPERIENCE_LEVELS.find((l) => l.value === job.experience_level)?.label;
  const hasSalary = job.salary_min || job.salary_max;
  const closed =
    job.status === "closed" ||
    (job.application_deadline && new Date(job.application_deadline) < new Date());

  const base = `/jobs/${job.id}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/jobs" className="text-sm text-slate-500 hover:text-slate-800">
        ← Retour aux offres
      </Link>

      <header className="mt-4 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          {company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt={companyName}
              className="h-16 w-16 rounded-xl border border-slate-100 object-contain"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-2xl font-bold text-blue-700">
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-slate-500">{companyName}</p>
            <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>📍 {job.location}{workMode ? ` · ${workMode}` : ""}</span>
              <span>💼 {job.type}</span>
              <span>{timeAgo(job.published_at ?? job.created_at)}</span>
              {job.status !== "published" && (
                <span className="font-semibold text-orange-600">({job.status})</span>
              )}
            </p>
          </div>
        </div>

        <ApplyAction
          jobId={job.id}
          companyId={job.company_id}
          jobTitle={job.title}
          viewerRole={viewer?.role ?? null}
          closed={!!closed}
        />
      </header>

      <nav className="mt-6 flex gap-6 border-b border-slate-200 text-sm">
        {[
          { key: "overview", label: "Vue d'ensemble" },
          { key: "company", label: "L'entreprise" },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? base : `${base}?tab=company`}
            className={`-mb-px border-b-2 pb-3 font-medium ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Description du poste</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {job.description}
            </p>

            <CheckList title="Responsabilités" items={job.responsibilities} />
            <CheckList title="Profil recherché" items={job.requirements} />

            {job.benefits && job.benefits.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Avantages</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {job.benefits.map((b: string, i: number) => (
                    <div
                      key={i}
                      className="rounded-xl bg-blue-50/60 px-4 py-3 text-center text-sm text-slate-700"
                    >
                      {b}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-2 text-base font-bold text-slate-900">Informations clés</h2>
              <InfoRow label="Localisation" value={job.location} />
              <InfoRow label="Type de contrat" value={job.type} />
              <InfoRow label="Niveau d'expérience" value={level} />
              <InfoRow label="Domaine" value={job.category} />
              <InfoRow label="Salaire" value={hasSalary ? salaryLabel(job) : "Non spécifié"} />
              <InfoRow label="Télétravail" value={workMode} />
              <InfoRow
                label="Date limite"
                value={
                  job.application_deadline
                    ? new Date(job.application_deadline).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : null
                }
              />
            </div>

            {job.skills && job.skills.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-3 text-base font-bold text-slate-900">Compétences requises</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">À propos de {companyName}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {company?.description || "Cette entreprise n'a pas encore renseigné sa présentation."}
          </p>
          <div className="mt-6 grid gap-x-8 md:grid-cols-2">
            <InfoRow label="Secteur" value={company?.sector} />
            <InfoRow label="Taille" value={company?.size ? `${company.size} employés` : null} />
            <InfoRow label="Ville" value={company?.city} />
            <InfoRow label="Site web" value={company?.website} />
          </div>
        </div>
      )}
    </div>
  );
}
