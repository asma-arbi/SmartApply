import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteJob } from "@/app/actions";

const labels: Record<string, string> = { draft: "Brouillon", published: "Publiée", closed: "Clôturée" };

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: jobs } = await supabase.from("jobs").select("*")
    .eq("company_id", user!.id).order("created_at", { ascending: false });
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold mb-4">Mes offres ({jobs?.length ?? 0})</h1>
      {jobs?.map((j) => (
        <div key={j.id} className="bg-white border rounded p-4 flex items-center justify-between">
          <div>
            <Link href={`/jobs/${j.id}`} className="font-semibold">{j.title}</Link>
            <p className="text-sm text-gray-500">{j.location} · {j.type} · {labels[j.status]}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href={`/dashboard/jobs/${j.id}`} className="text-blue-600">Modifier</Link>
            <form action={deleteJob.bind(null, j.id)}><button className="text-red-600">Supprimer</button></form>
          </div>
        </div>
      ))}
      {!jobs?.length && <p className="text-gray-500">Vous n&apos;avez pas encore publié d&apos;offre.</p>}
    </div>
  );
}
