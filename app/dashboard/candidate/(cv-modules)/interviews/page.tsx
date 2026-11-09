import Link from "next/link";
import { listApplications, readInterview } from "@/cv-module/actions/applicationActions";

export const dynamic = "force-dynamic";

type Interview = {
  scheduledAt: string | null;
  durationMinutes: number;
  mode: string;
  location: string;
  note: string;
};

const modeLabels: Record<string, string> = {
  VISIO: "Visioconférence",
  ONSITE: "Sur site",
  PHONE: "Téléphone",
};

const fmt = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("fr-FR", {
        timeZone: "Africa/Tunis",
        dateStyle: "full",
        timeStyle: "short",
      })
    : "";

export default async function CandidateInterviewsPage() {
  const apps = await listApplications();

  if (!apps.ok) {
    return (
      <section className="p-8">
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{apps.error.message}</p>
      </section>
    );
  }

  const withInterview = await Promise.all(
    (apps.data as any[])
      .filter((a) => a.status === "INTERVIEW")
      .map(async (a) => {
        const r = await readInterview(a.id);
        return { app: a, interview: r.ok ? (r.data as Interview | null) : null };
      })
  );

  return (
    <section className="mx-auto max-w-4xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Mes entretiens</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Les entretiens planifiés par les entreprises auxquelles vous avez postulé.
      </p>

      {withInterview.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Aucun entretien planifié pour le moment.
        </p>
      ) : (
        <div className="space-y-4">
          {withInterview.map(({ app, interview }) => (
            <article key={app.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">
                {app.job_title ?? "Candidature spontanée"}
              </p>
              <p className="text-xs text-slate-500">{app.company_name}</p>

              {interview ? (
                <div className="mt-3 rounded-xl bg-emerald-50/60 p-3 text-sm text-slate-700">
                  <p className="font-medium">{fmt(interview.scheduledAt)}</p>
                  <p className="text-xs text-slate-500">
                    {interview.durationMinutes} min · {modeLabels[interview.mode] ?? interview.mode}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-600">{interview.location}</p>
                  {interview.note && <p className="mt-1 text-xs text-slate-500">{interview.note}</p>}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">Détails de l&apos;entretien à venir.</p>
              )}
            </article>
          ))}
        </div>
      )}

      <Link
        href="/dashboard/candidate/applications"
        className="mt-6 inline-block text-sm text-blue-600 hover:underline"
      >
        Voir toutes mes candidatures
      </Link>
    </section>
  );
}
