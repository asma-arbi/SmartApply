"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function register(fd: FormData) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(fd.get("email")),
    password: String(fd.get("password")),
    options: { data: { name: String(fd.get("name")) } },
  });
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  // Si la confirmation par email est activée, il n'y a pas encore de session
  redirect(data.session ? "/dashboard" : "/login?msg=confirm");
}

export async function login(fd: FormData) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email")),
    password: String(fd.get("password")),
  });
  if (error) redirect("/login?error=1");
  redirect("/dashboard");
}

export async function logout() {
  await createClient().auth.signOut();
  redirect("/");
}

export async function saveJob(fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const id = String(fd.get("id") ?? "");
  const values = {
    title: String(fd.get("title")),
    location: String(fd.get("location")),
    type: String(fd.get("type")),
    description: String(fd.get("description")),
    status: String(fd.get("status")),
  };
  // La RLS garantit qu'on ne modifie que ses propres offres
  if (id) await supabase.from("jobs").update(values).eq("id", id);
  else await supabase.from("jobs").insert({ ...values, company_id: user.id });
  revalidatePath("/");
  redirect("/dashboard");
}

export async function deleteJob(id: string) {
  await createClient().from("jobs").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/dashboard");
}
