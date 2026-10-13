import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").replace(/[,()%]/g, "");
  let query = createClient().from("jobs").select("*, companies(name)")
    .eq("status", "published").order("created_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
  const { data: jobs } = await query;
  return (
    <>
      <form className="flex gap-2 mb-6">
        <input name="q" defaultValue={q} placeholder="Poste ou ville…" className="flex-1 border rounded px-3 py-2" />
        <button className="bg-blue-600 text-white px-4 rounded">Rechercher</button>
      </form>
      <div className="space-y-3">
        {jobs?.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="block bg-white border rounded p-4 hover:shadow">
            <h2 className="font-semibold">{j.title}</h2>
            <p className="text-sm text-gray-600">{j.companies?.name} · {j.location} · {j.type}</p>
          </Link>
        ))}
        {!jobs?.length && <p className="text-gray-500">Aucune offre pour le moment.</p>}
      </div>
    </>
  );
}
