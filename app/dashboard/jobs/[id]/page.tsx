import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import { Job } from "@/lib/models/types";
import JobForm from "@/app/dashboard/company/jobs/components/JobForm";

export const dynamic = "force-dynamic";

export default async function JobEditPage({ params }: { params: { id: string } }) {
  const sessionData = await getSessionUser();

  if (!sessionData) redirect("/login");
  if (sessionData.user.role !== "entreprise") {
    redirect("/access-denied");
  }

  const db = await getDb();
  const job = await db.collection<Job>("jobs").findOne({
    id: params.id,
    company_id: sessionData.user.id,
  });

  if (!job) {
    redirect("/dashboard/company/jobs");
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Modifier l&apos;offre</h1>
        <p className="text-slate-500 text-sm mt-1">
          Mettez à jour les informations de votre offre
        </p>
      </div>

      <JobForm job={job} />
    </div>
  );
}
