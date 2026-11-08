import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import "./_module/index.css";
import App from "./_module/App";

export const dynamic = "force-dynamic";

const ROLE_MAP: Record<string, "ENTERPRISE" | "CANDIDATE" | "ADMIN"> = {
  entreprise: "ENTERPRISE",
  candidat: "CANDIDATE",
  admin: "ADMIN",
};

export default async function InterviewsPage() {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");

  const { user } = sessionData;
  const role = ROLE_MAP[user.role] ?? "CANDIDATE";

  let companyName: string | undefined;
  if (role === "ENTERPRISE") {
    const db = await getDb();
    const company = await db.collection("companies").findOne({ id: user.id });
    companyName = (company as { name?: string } | null)?.name;
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    companyId: role === "ENTERPRISE" ? user.id : undefined,
    companyName,
  };

  return <App sessionUser={sessionUser} />;
}