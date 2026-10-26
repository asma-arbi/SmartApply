import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/app/components/Sidebar";
import TopBar from "@/app/components/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let role = (user.user_metadata?.role as string) ?? "";
  if (!role || role === "candidat") {
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.role) role = prof.role;
    } catch {}
  }
  if (!role) role = "candidat";

  const name = (user.user_metadata?.name as string) ?? user.email?.split("@")[0] ?? "Utilisateur";
  const email = user.email ?? "";

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
