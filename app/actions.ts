"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
//  AUTH ACTIONS — Module A : Identité, accès et vie privée
// ═══════════════════════════════════════════════════════════════

/** A1 — Inscription email + mot de passe */
export async function register(fd: FormData) {
  const supabase = createClient();

  const email    = String(fd.get("email") ?? "");
  const password = String(fd.get("password") ?? "");
  const name     = String(fd.get("name") ?? "");
  const role     = String(fd.get("role") ?? "candidat");
  const companyName = String(fd.get("company_name") ?? name);
  const tos      = fd.get("tos") === "on";
  const aiCv     = fd.get("ai_cv") === "on";

  // Validation côté serveur
  if (password.length < 8) {
    redirect("/register?error=password_too_short&role=" + role);
  }
  if (!tos) {
    redirect("/register?error=tos_required&role=" + role);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
        company_name: role === "entreprise" ? companyName : undefined,
      },
    },
  });

  if (error) {
    // A1 : message générique — ne révèle jamais si l'email existe
    redirect("/register?error=generic&role=" + role);
  }

  // Enregistrer le consentement (A7)
  if (data.user) {
    await supabase.from("consent_records").insert({
      user_id: data.user.id,
      tos_version: "1.0",
      privacy_version: "1.0",
      ai_cv_consent: aiCv,
    });
  }

  redirect("/verify-email?email=" + encodeURIComponent(email));
}

/** A1 — Connexion email + mot de passe */
export async function login(fd: FormData) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email") ?? ""),
    password: String(fd.get("password") ?? ""),
  });

  if (error) {
    // A12 — message si trop de tentatives
    if (error.status === 429 || error.message?.toLowerCase().includes("rate")) {
      redirect("/login?error=locked");
    }
    // A1 — message générique (ne révèle pas si l'email existe)
    redirect("/login?error=invalid");
  }

  if (!data.user?.email_confirmed_at) {
    // A3 — email pas encore vérifié
    redirect("/verify-email?email=" + encodeURIComponent(String(fd.get("email"))));
  }

  // A5 — redirection selon le rôle
  const role = data.user?.user_metadata?.role ?? "candidat";
  if (role === "admin") redirect("/dashboard/admin");
  if (role === "entreprise") redirect("/dashboard/company");
  redirect("/dashboard/candidate");
}

/** A2 — Connexion Google OAuth */
export async function loginWithGoogle() {
  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) redirect("/login?error=invalid");
  redirect(data.url);
}

/** Déconnexion */
export async function logout() {
  await createClient().auth.signOut();
  redirect("/");
}

/** A3 — Renvoyer l'email de vérification */
export async function resendVerificationEmail(email: string) {
  const supabase = createClient();
  await supabase.auth.resend({ type: "signup", email });
}

/** A4 — Mot de passe oublié */
export async function forgotPassword(fd: FormData) {
  const supabase = createClient();
  const email = String(fd.get("email") ?? "");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Toujours retourner succès (évite l'énumération d'emails)
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  redirect("/forgot-password?sent=1");
}

/** A4 — Réinitialiser le mot de passe */
export async function resetPassword(fd: FormData) {
  const supabase = createClient();
  const password = String(fd.get("password") ?? "");

  if (password.length < 8) {
    redirect("/reset-password?error=password_too_short");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=generic");

  redirect("/login?msg=password_reset");
}

// ═══════════════════════════════════════════════════════════════
//  JOBS ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function saveJob(fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(fd.get("id") ?? "");
  const values = {
    title:       String(fd.get("title")),
    location:    String(fd.get("location")),
    type:        String(fd.get("type")),
    description: String(fd.get("description")),
    status:      String(fd.get("status")),
  };

  if (id) {
    await supabase.from("jobs").update(values).eq("id", id);
  } else {
    await supabase.from("jobs").insert({ ...values, company_id: user.id });
  }

  revalidatePath("/");
  revalidatePath("/dashboard/company");
  redirect("/dashboard/company");
}

export async function deleteJob(id: string) {
  await createClient().from("jobs").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/dashboard/company");
}
