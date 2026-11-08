import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import Sidebar from "@/app/components/Sidebar";
import TopBar from "@/app/components/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionData = await getSessionUser();

  if (!sessionData) {
    redirect("/login?revoked=1");
  }

  const role = sessionData.user.role || "candidat";
  const name = sessionData.user.name || sessionData.user.email?.split("@")[0] || "Utilisateur";
  const email = sessionData.user.email || "";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} userName={name} userEmail={email} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar userName={name} userEmail={email} role={role} />
        <main className="overflow-auto flex-1 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
