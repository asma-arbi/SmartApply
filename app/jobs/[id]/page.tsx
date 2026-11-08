import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { Job, Company } from "@/lib/models/types";

export default async function JobPage({ params }: { params: { id: string } }) {
  const db = await getDb();
  const job = await db.collection<Job>("jobs").findOne({ id: params.id });

  if (!job) notFound();

  const company = job.company_id
    ? await db.collection<Company>("companies").findOne({ id: job.company_id })
    : null;

  return (
    <article className="bg-white border rounded p-6">
      <h1 className="text-2xl font-bold">{job.title}</h1>
      <p className="text-gray-600 mb-4">
        {company?.name ?? "Entreprise"} · {job.location} · {job.type}
        {job.status !== "published" && <span className="ml-2 text-orange-600">({job.status})</span>}
      </p>
      <p className="whitespace-pre-line">{job.description}</p>
    </article>
  );
}
