import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/app/components/Sidebar";

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

  const role = (user.user_metadata?.role as string) ?? "candidat";
  const name = (user.user_metadata?.name as string) ?? user.email ?? "";
  const email = user.email ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={role} userName={name} userEmail={email} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
