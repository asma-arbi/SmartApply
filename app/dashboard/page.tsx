import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role ?? "candidat";

  if (role === "admin") redirect("/dashboard/admin");
  if (role === "entreprise") redirect("/dashboard/company");
  redirect("/dashboard/candidate");
}
