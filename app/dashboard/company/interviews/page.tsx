import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { listReceivedApplications } from "@/cv-module/actions/applicationActions";
import ReceivedApplications, { type Received } from "./ReceivedApplications";

export const dynamic = "force-dynamic";

export default async function CompanyApplicationsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.user.role !== "entreprise") redirect("/access-denied");

  const result = await listReceivedApplications();

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Candidatures reçues</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Consultez les candidats qui ont postulé à vos offres et planifiez leurs entretiens.
      </p>

      {result.ok ? (
        <ReceivedApplications items={result.data as Received[]} />
      ) : (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{result.error.message}</p>
      )}
    </div>
  );
}
