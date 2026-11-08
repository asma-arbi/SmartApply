import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const sessionData = await getSessionUser();

  if (!sessionData) redirect("/login");

  const role = sessionData.user.role;

  if (role === "admin") redirect("/dashboard/admin");
  if (role === "entreprise") redirect("/dashboard/company");
  redirect("/dashboard/candidate");
}
