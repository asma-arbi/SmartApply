import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import JobForm from "../components/JobForm";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const sessionData = await getSessionUser();

  if (!sessionData) redirect("/login");
  if (sessionData.user.role !== "entreprise") {
    redirect("/access-denied");
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Créer une offre d&apos;emploi</h1>
        <p className="text-slate-500 text-sm mt-1">
          Remplissez les informations de votre offre
        </p>
      </div>

      <JobForm />
    </div>
  );
}
