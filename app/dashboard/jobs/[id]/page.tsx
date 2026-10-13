import { createClient } from "@/lib/supabase/server";
import { saveJob } from "@/app/actions";

// /dashboard/jobs/new = création ; /dashboard/jobs/<uuid> = modification
export default async function JobForm({ params }: { params: { id: string } }) {
  const isNew = params.id === "new";
  const job = isNew ? null : (await createClient().from("jobs").select("*").eq("id", params.id).single()).data;
  const input = "w-full border rounded px-3 py-2";
  return (
    <form action={saveJob} className="bg-white border rounded p-6 space-y-3 max-w-xl">
      <h1 className="text-xl font-bold">{isNew ? "Publier une offre" : "Modifier l'offre"}</h1>
      {job && <input type="hidden" name="id" value={job.id} />}
      <input name="title" required defaultValue={job?.title} placeholder="Intitulé du poste" className={input} />
      <input name="location" required defaultValue={job?.location} placeholder="Lieu (ex. Tunis, Remote)" className={input} />
      <select name="type" defaultValue={job?.type ?? "CDI"} className={input}>
        <option>CDI</option><option>CDD</option><option>Stage</option><option>Freelance</option>
      </select>
      <textarea name="description" required rows={8} defaultValue={job?.description} placeholder="Description du poste" className={input} />
      <select name="status" defaultValue={job?.status ?? "published"} className={input}>
        <option value="published">Publiée</option>
        <option value="draft">Brouillon</option>
        <option value="closed">Clôturée</option>
      </select>
      <button className="bg-blue-600 text-white px-4 py-2 rounded">Enregistrer</button>
    </form>
  );
}
