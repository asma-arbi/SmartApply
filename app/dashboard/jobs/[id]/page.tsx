import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import { Job } from "@/lib/models/types";
import { saveJob } from "@/app/actions";

export const dynamic = "force-dynamic";

// /dashboard/jobs/new = création ; /dashboard/jobs/<uuid> = modification
export default async function JobFormPage({ params }: { params: { id: string } }) {
  const sessionData = await getSessionUser();

  if (!sessionData) redirect("/login");
  if (sessionData.user.role !== "entreprise") {
    redirect("/access-denied");
  }

  const isNew = params.id === "new";
  let job: Job | null = null;

  if (!isNew) {
    const db = await getDb();
    job = await db.collection<Job>("jobs").findOne({
      id: params.id,
      company_id: sessionData.user.id,
    });

    if (!job) {
      redirect("/dashboard/company/jobs");
    }
  }

  const input = "w-full border rounded px-3 py-2";

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {isNew ? "Publier une offre" : "Modifier l'offre"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isNew
            ? "Renseignez les informations de votre nouvelle offre"
            : "Mettez à jour les informations de votre offre"}
        </p>
      </div>

      <form action={saveJob} className="bg-white border rounded p-6 space-y-3 max-w-xl">
        {job && <input type="hidden" name="id" value={job.id} />}

        <input
          name="title"
          required
          defaultValue={job?.title}
          placeholder="Intitulé du poste"
          className={input}
        />

        <input
          name="location"
          required
          defaultValue={job?.location}
          placeholder="Lieu (ex. Tunis, Remote)"
          className={input}
        />

        <select name="type" defaultValue={job?.type ?? "CDI"} className={input}>
          <option>CDI</option>
          <option>CDD</option>
          <option>Stage</option>
          <option>Freelance</option>
        </select>

        <textarea
          name="description"
          required
          rows={8}
          defaultValue={job?.description}
          placeholder="Description du poste"
          className={input}
        />

        <select name="status" defaultValue={job?.status ?? "published"} className={input}>
          <option value="published">Publiée</option>
          <option value="draft">Brouillon</option>
          <option value="closed">Clôturée</option>
        </select>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Enregistrer
        </button>
      </form>
    </div>
  );
}