import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function JobPage({ params }: { params: { id: string } }) {
  const { data: job } = await createClient().from("jobs")
    .select("*, companies(name, website)").eq("id", params.id).single();
  if (!job) notFound();
  return (
    <article className="bg-white border rounded p-6">
      <h1 className="text-2xl font-bold">{job.title}</h1>
      <p className="text-gray-600 mb-4">
        {job.companies?.name} · {job.location} · {job.type}
        {job.status !== "published" && <span className="ml-2 text-orange-600">({job.status})</span>}
      </p>
      <p className="whitespace-pre-line">{job.description}</p>
    </article>
  );
}
