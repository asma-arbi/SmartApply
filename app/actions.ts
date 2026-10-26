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

  const email    = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const name     = String(fd.get("name") ?? "").trim();
  const role     = String(fd.get("role") ?? "candidat");
  const companyName = String(fd.get("company_name") ?? name).trim();
  const tos      = fd.get("tos") === "on";
  const aiCv     = fd.get("ai_cv") === "on";

  // Validation côté serveur
  if (password.length < 8) {
    redirect("/register?error=password_too_short&role=" + role);
  }
  if (!tos) {
    redirect("/register?error=tos_required&role=" + role);
  }

  // 1. Inscription Supabase
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

  // Si l'utilisateur est déjà inscrit ou en cas d'erreur
  if (error) {
    console.warn("[register] signUp error:", error.message);
    const msg = error.message.toLowerCase();

    // Si limite d'envoi d'emails atteinte par Supabase
    if (msg.includes("rate") || msg.includes("limit")) {
      redirect("/register?error=rate_limit&role=" + role);
    }

    if (msg.includes("invalid") || msg.includes("valid")) {
      redirect("/register?error=invalid_email&role=" + role);
    }

    // Si le compte existe déjà, on tente de connecter l'utilisateur avec ce mot de passe
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInErr && signInData.user) {
        if (role === "admin") {
          try {
            await supabase.auth.updateUser({ data: { role: "admin", name } });
          } catch {}
          try {
            await supabase.from("profiles").upsert(
              { id: signInData.user.id, role: "admin", full_name: name, email },
              { onConflict: "id" }
            );
          } catch {}
        }

        revalidatePath("/");
        revalidatePath("/dashboard");
        if (role === "admin") redirect("/dashboard/admin");
        if (role === "entreprise") redirect("/dashboard/company");
        redirect("/dashboard/candidate");
      }

      // Mot de passe incorrect ou compte nécessitant connexion
      redirect("/login?registered=1&email=" + encodeURIComponent(email));
    }

    redirect("/register?error=generic&role=" + role);
  }

  if (data.user) {
    // Profil fallback
    try {
      await supabase.from("profiles").upsert(
        { id: data.user.id, role, full_name: name, email },
        { onConflict: "id" }
      );
    } catch {}

    // Si entreprise, assurer la présence dans la table companies
    if (role === "entreprise") {
      try {
        await supabase.from("companies").upsert(
          { id: data.user.id, name: companyName || name, status: "pending" },
          { onConflict: "id" }
        );
      } catch {}
    }

    // Consentement fallback
    try {
      await supabase.from("consent_records").insert({
        user_id: data.user.id,
        tos_version: "1.0",
        privacy_version: "1.0",
        ai_cv_consent: aiCv,
      });
    } catch {}

    // Tentative de connexion immédiate pour créer le cookie de session
    const { data: directSignIn, error: directSignInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!directSignInErr && directSignIn.session) {
      revalidatePath("/");
      revalidatePath("/dashboard");
      if (role === "admin") redirect("/dashboard/admin");
      if (role === "entreprise") redirect("/dashboard/company");
      redirect("/dashboard/candidate");
    }

    // Si session active retournée par signUp
    if (data.session) {
      revalidatePath("/");
      revalidatePath("/dashboard");
      if (role === "admin") redirect("/dashboard/admin");
      if (role === "entreprise") redirect("/dashboard/company");
      redirect("/dashboard/candidate");
    }
  }

  // Redirection directe vers le dashboard ou la connexion (plus de verify-email)
  revalidatePath("/");
  revalidatePath("/dashboard");
  if (role === "entreprise") redirect("/dashboard/company");
  redirect("/dashboard/candidate");
}

/** A1 — Connexion email + mot de passe */
export async function login(fd: FormData) {
  const supabase = createClient();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=invalid");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[login] signInWithPassword error:", error.message, error.status);
    if (error.status === 429 || error.message?.toLowerCase().includes("rate")) {
      redirect("/login?error=locked");
    }
    if (error.message?.toLowerCase().includes("confirm")) {
      redirect("/login?error=email_unconfirmed&email=" + encodeURIComponent(email));
    }
    redirect("/login?error=invalid");
  }

  // Résolution du rôle : metadata -> profil public -> par défaut candidat
  let role = (data.user?.user_metadata?.role as string) ?? "";
  if (!role || role === "candidat") {
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (prof?.role) role = prof.role;
    } catch {}
  }
  if (!role) role = "candidat";

  revalidatePath("/");
  revalidatePath("/dashboard");
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

// ═══════════════════════════════════════════════════════════════
//  COMPANY & ADMIN ACTIONS
// ═══════════════════════════════════════════════════════════════

/** Mise à jour du profil entreprise */
export async function updateCompany(fd: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = String(fd.get("name") ?? "").trim();
  if (!name) {
    redirect("/dashboard/company/edit?error=name_required");
  }

  const sector = String(fd.get("sector") ?? "").trim() || null;
  const rawSize = String(fd.get("size") ?? "").trim();
  const validSizes = ["1-10", "11-50", "51-200", "201-500", "500+"];
  const size = validSizes.includes(rawSize) ? rawSize : null;
  const city = String(fd.get("city") ?? "").trim() || null;
  const website = String(fd.get("website") ?? "").trim() || null;
  const description = String(fd.get("description") ?? "").trim() || null;
  const phone = String(fd.get("phone") ?? "").trim() || null;
  const linkedin_url = String(fd.get("linkedin_url") ?? "").trim() || null;
  const logo_url = String(fd.get("logo_url") ?? "").trim() || null;

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      sector,
      size,
      city,
      website,
      description,
      phone,
      linkedin_url,
      ...(logo_url ? { logo_url } : {}),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[updateCompany] update error:", error.message);
    redirect("/dashboard/company/edit?error=update_failed");
  }

  // Mettre à jour les métadonnées utilisateur pour la cohérence
  try {
    await supabase.auth.updateUser({
      data: { company_name: name, name },
    });
  } catch (metaErr) {
    console.warn("[updateCompany] updateUser metadata error:", metaErr);
  }

  revalidatePath("/");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/company/edit");
  revalidatePath("/dashboard/candidate");
  revalidatePath("/dashboard/candidate/companies");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/company");
}

/** Admin valide une entreprise */
export async function verifyCompany(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Vérifier rôle admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin =
    profile?.role === "admin" || user.user_metadata?.role === "admin";
  if (!isAdmin) {
    throw new Error("Action non autorisée : droits administrateur requis.");
  }

  const { error } = await supabase
    .from("companies")
    .update({
      status: "verified",
      rejection_reason: null,
    })
    .eq("id", id);

  if (error) {
    console.error("[verifyCompany] error:", error.message);
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/candidate");
  revalidatePath("/dashboard/candidate/companies");
  revalidatePath("/dashboard/company");
}

/** Admin rejette une entreprise */
export async function rejectCompany(
  id: string,
  reason: string = "Dossier incomplet ou non conforme aux conditions d'utilisation"
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Vérifier rôle admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin =
    profile?.role === "admin" || user.user_metadata?.role === "admin";
  if (!isAdmin) {
    throw new Error("Action non autorisée : droits administrateur requis.");
  }

  const { error } = await supabase
    .from("companies")
    .update({
      status: "rejected",
      rejection_reason: reason || "Dossier non validé par l'équipe d'administration",
    })
    .eq("id", id);

  if (error) {
    console.error("[rejectCompany] error:", error.message);
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/companies");
  revalidatePath("/dashboard/candidate");
  revalidatePath("/dashboard/candidate/companies");
  revalidatePath("/dashboard/company");
}

/** Admin supprime une entreprise */
export async function adminDeleteCompany(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Supprimer les offres de l'entreprise d'abord
  await supabase.from("jobs").delete().eq("company_id", id);
  // Supprimer l'entreprise
  const { error } = await supabase.from("companies").delete().eq("id", id);

  if (error) {
    console.error("[adminDeleteCompany] error:", error.message);
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/companies");
  revalidatePath("/dashboard/candidate/companies");
}

/** Admin modifie une entreprise */
export async function adminUpdateCompany(fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const sector = String(fd.get("sector") ?? "").trim() || null;
  const city = String(fd.get("city") ?? "").trim() || null;
  const status = String(fd.get("status") ?? "verified");
  const website = String(fd.get("website") ?? "").trim() || null;
  const description = String(fd.get("description") ?? "").trim() || null;

  if (!id || !name) {
    throw new Error("ID et nom requis.");
  }

  const { error } = await supabase
    .from("companies")
    .update({ name, sector, city, status, website, description })
    .eq("id", id);

  if (error) {
    console.error("[adminUpdateCompany] error:", error.message);
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/companies");
  revalidatePath("/dashboard/candidate/companies");
}

/** Admin change le rôle d'un utilisateur (ex: candidat <-> admin <-> entreprise) */
export async function adminUpdateUserRole(userId: string, newRole: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!["candidat", "entreprise", "admin"].includes(newRole)) {
    throw new Error("Rôle invalide");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("[adminUpdateUserRole] error:", error.message);
    throw error;
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
}

/** Admin supprime un utilisateur / profil */
export async function adminDeleteUser(userId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Supprimer profil
  await supabase.from("profiles").delete().eq("id", userId);
  // Supprimer offres liées si entreprise
  await supabase.from("jobs").delete().eq("company_id", userId);
  // Supprimer entreprise si existante
  await supabase.from("companies").delete().eq("id", userId);
  // Supprimer consent_records
  await supabase.from("consent_records").delete().eq("user_id", userId);

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/companies");
}

/** Admin modifie le statut d'une offre d'emploi */
export async function adminUpdateJobStatus(jobId: string, status: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!["published", "draft", "closed"].includes(status)) {
    throw new Error("Statut invalide");
  }

  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId);

  if (error) {
    console.error("[adminUpdateJobStatus] error:", error.message);
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/jobs");
  revalidatePath("/dashboard/company");
}

/** Admin supprime n'importe quelle offre d'emploi */
export async function adminDeleteJob(jobId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId);

  if (error) {
    console.error("[adminDeleteJob] error:", error.message);
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/jobs");
}

/** Promouvoir l'utilisateur connecté en Administrateur */
export async function promoteSelfToAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Mettre à jour profiles
  await supabase
    .from("profiles")
    .upsert({ id: user.id, role: "admin", updated_at: new Date().toISOString() });

  // Mettre à jour metadata
  try {
    await supabase.auth.updateUser({
      data: { role: "admin" }
    });
  } catch {}

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin");
}

