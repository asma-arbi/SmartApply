"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb, initDatabase } from "@/lib/mongodb";
import {
  createSession,
  getSessionUser,
  destroyCurrentSession,
  listActiveSessions,
  revokeSessionById,
  invalidateAllUserSessions,
  revokeAllOtherSessions,
} from "@/lib/auth/session";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { User, Profile, Company, Job, ConsentRecord } from "@/lib/models/types";

// ═══════════════════════════════════════════════════════════════
//  AUTH ACTIONS — Module A : Identité, Accès & Sessions
// ═══════════════════════════════════════════════════════════════

/** A1 — Inscription email + mot de passe avec reCAPTCHA & Sessions */
export async function register(fd: FormData) {
  await initDatabase();
  const db = await getDb();

  const email       = String(fd.get("email") ?? "").trim().toLowerCase();
  const password    = String(fd.get("password") ?? "");
  const name        = String(fd.get("name") ?? "").trim();
  const role        = (String(fd.get("role") ?? "candidat")) as "candidat" | "entreprise" | "admin";
  const companyName = String(fd.get("company_name") ?? name).trim();
  const tos         = fd.get("tos") === "on";
  const aiCv        = fd.get("ai_cv") === "on";
  const recaptchaToken = String(fd.get("recaptcha_token") ?? "");

  // 1. Validation des champs
  if (password.length < 8) {
    redirect("/register?error=password_too_short&role=" + role);
  }
  if (!tos) {
    redirect("/register?error=tos_required&role=" + role);
  }

  // 2. Vérification reCAPTCHA obligatoire
  const recaptchaVerified = fd.get("recaptcha_verified") === "1";
  if (!recaptchaVerified) {
    redirect("/register?error=recaptcha_failed&role=" + role);
  }

  const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, "register");
  if (!recaptchaResult.success) {
    console.warn("[Register] reCAPTCHA bloqué :", recaptchaResult.error);
    redirect("/register?error=recaptcha_failed&role=" + role);
  }

  // 3. Vérifier si l'utilisateur existe déjà
  const existingUser = await db.collection<User>("users").findOne({ email });

  if (existingUser) {
    // Si l'utilisateur existe déjà, tenter de vérifier le mot de passe pour auto-connexion
    const isPasswordValid = await bcrypt.compare(password, existingUser.password_hash);
    if (isPasswordValid) {
      await createSession({
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
      });

      revalidatePath("/");
      revalidatePath("/dashboard");
      if (existingUser.role === "admin") redirect("/dashboard/admin");
      if (existingUser.role === "entreprise") redirect("/dashboard/company");
      redirect("/dashboard/candidate");
    }

    redirect("/login?registered=1&email=" + encodeURIComponent(email));
  }

  // 4. Créer le nouvel utilisateur
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const newUser: User = {
    id: userId,
    email,
    password_hash: passwordHash,
    name,
    role,
    company_name: role === "entreprise" ? companyName : undefined,
    created_at: now,
    updated_at: now,
  };

  await db.collection("users").insertOne(newUser as any);

  // 5. Créer le profil public
  const newProfile: Profile = {
    id: userId,
    role,
    full_name: name,
    email,
    language: "fr",
    notifications_enabled: true,
    visible_to_companies: false,
    created_at: now,
    updated_at: now,
  };
  await db.collection("profiles").insertOne(newProfile as any);

  // 6. Si entreprise, créer la fiche entreprise en statut "pending"
  if (role === "entreprise") {
    const newCompany: Company = {
      id: userId,
      name: companyName || name,
      status: "pending",
      created_at: now,
    };
    await db.collection("companies").insertOne(newCompany as any);
  }

  // 7. Enregistrer le consentement RGPD
  const consent: ConsentRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    tos_version: "1.0",
    privacy_version: "1.0",
    ai_cv_consent: aiCv,
    consented_at: now,
  };
  await db.collection("consent_records").insertOne(consent as any);

  // 8. Ouvrir la session sécurisée avec cookies HTTP-Only et tokens
  await createSession({
    id: userId,
    email,
    name,
    role,
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  if (role === "admin") redirect("/dashboard/admin");
  if (role === "entreprise") redirect("/dashboard/company");
  redirect("/dashboard/candidate");
}

/** A1 — Connexion email + mot de passe avec reCAPTCHA & Sessions */
export async function login(fd: FormData) {
  await initDatabase();
  const db = await getDb();

  const email    = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const recaptchaToken = String(fd.get("recaptcha_token") ?? "");

  if (!email || !password) {
    redirect("/login?error=invalid");
  }

  // 1. Vérification reCAPTCHA obligatoire
  const recaptchaVerified = fd.get("recaptcha_verified") === "1";
  if (!recaptchaVerified) {
    redirect("/login?error=recaptcha_failed");
  }

  const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, "login");
  if (!recaptchaResult.success) {
    console.warn("[Login] reCAPTCHA bloqué :", recaptchaResult.error);
    redirect("/login?error=recaptcha_failed");
  }

  // 2. Recherche de l'utilisateur
  let user: User | null = await db.collection<User>("users").findOne({ email });

  // Cas spécial initial : Si aucun utilisateur n'existe encore et que l'admin initial se connecte
  if (!user && (email === "asma.arbi@esprit.tn" || email === "asmaarbi27@gmail.com")) {
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const adminUser: User = {
      id: userId,
      email,
      password_hash: passwordHash,
      name: "Super Admin",
      role: "admin",
      created_at: now,
      updated_at: now,
    };
    await db.collection("users").insertOne(adminUser as any);
    await db.collection("profiles").insertOne({
      id: userId,
      role: "admin",
      full_name: "Super Admin",
      email,
      language: "fr",
      notifications_enabled: true,
      visible_to_companies: false,
      created_at: now,
      updated_at: now,
    } as any);

    user = adminUser;
  }

  if (!user) {
    console.warn(`[Login] Utilisateur non trouvé dans MongoDB : "${email}"`);
    redirect(`/login?error=user_not_found&email=${encodeURIComponent(email)}`);
  }

  // Si le compte a été créé via Google et n'a pas encore de mot de passe local défini
  if (user.auth_provider === "google" && (!user.password_hash || user.password_hash === "")) {
    console.info(`[Login] Compte Google sans mot de passe local : "${email}"`);
    redirect("/login?error=use_google");
  }

  // 3. Vérification du mot de passe avec bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    console.warn(`[Login] Mot de passe incorrect pour : "${email}"`);
    redirect(`/login?error=wrong_password&email=${encodeURIComponent(email)}`);
  }

  // 4. Création de la session sécurisée
  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  if (user.role === "admin") redirect("/dashboard/admin");
  if (user.role === "entreprise") redirect("/dashboard/company");
  redirect("/dashboard/candidate");
}

/** Déconnexion révoquant la session active */
export async function logout() {
  await destroyCurrentSession();
  revalidatePath("/");
  redirect("/");
}

/** A3 — Renvoyer l'email de vérification (compatibilité e-mails virtuels) */
export async function resendVerificationEmail(_email?: string) {
  void _email;
  // Option désactivée pour faciliter les tests directs avec des e-mails virtuels
  return { success: true };
}

/** A4 — Mot de passe oublié avec reCAPTCHA */
export async function forgotPassword(fd: FormData) {
  await initDatabase();
  const db = await getDb();

  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const recaptchaToken = String(fd.get("recaptcha_token") ?? "");

  const recaptchaVerified = fd.get("recaptcha_verified") === "1";
  if (!recaptchaVerified) {
    redirect("/forgot-password?error=recaptcha_failed");
  }

  const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, "forgot_password");
  if (!recaptchaResult.success) {
    redirect("/forgot-password?error=recaptcha_failed");
  }

  const user = await db.collection<User>("users").findOne({ email });

  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 heure

    await db.collection("users").updateOne(
      { id: user.id },
      { $set: { reset_token: resetToken, reset_token_expires: expiresAt } }
    );

    redirect(`/forgot-password?sent=1&token=${resetToken}`);
  }

  redirect("/forgot-password?sent=1");
}

/** A4 — Réinitialiser le mot de passe & Invalidation de TOUTES les sessions */
export async function resetPassword(fd: FormData) {
  await initDatabase();
  const db = await getDb();

  const password = String(fd.get("password") ?? "");
  const token = String(fd.get("token") ?? "").trim();

  if (password.length < 8) {
    redirect("/reset-password?error=password_too_short");
  }

  const now = new Date().toISOString();
  let user: User | null = null;

  if (token) {
    user = await db.collection<User>("users").findOne({
      reset_token: token,
      reset_token_expires: { $gt: now },
    });
  } else {
    // Si aucun token, vérifier si l'utilisateur est connecté et réinitialise depuis son profil
    const sessionData = await getSessionUser();
    if (sessionData) {
      user = await db.collection<User>("users").findOne({ id: sessionData.user.id });
    }
  }

  if (!user) {
    redirect("/reset-password?error=generic");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection("users").updateOne(
    { id: user.id },
    {
      $set: {
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
        updated_at: now,
      },
    }
  );

  // ⚠️ CRITIQUE : Invalider TOUTES les sessions actives sur tous les appareils
  await invalidateAllUserSessions(user.id);

  redirect("/login?msg=password_reset");
}

// ═══════════════════════════════════════════════════════════════
//  SESSIONS MANAGEMENT ACTIONS
// ═══════════════════════════════════════════════════════════════

/** Lister les sessions actives de l'utilisateur connecté */
export async function getMySessions() {
  const sessionData = await getSessionUser();
  if (!sessionData) return [];
  return await listActiveSessions(sessionData.user.id);
}

/** Révoquer une session spécifique */
export async function revokeSessionAction(sessionId: string) {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login?revoked=1");

  await revokeSessionById(sessionId, sessionData.user.id);

  // Si l'utilisateur révoque la session sur laquelle il se trouve actuellement
  if (sessionId === sessionData.sessionId) {
    await destroyCurrentSession();
    redirect("/login?revoked=1");
  }

  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/candidate/settings");
}

/** Déconnecter tous les appareils sauf l'actuel */
export async function revokeAllOtherSessionsAction() {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login?revoked=1");

  await revokeAllOtherSessions(sessionData.user.id, sessionData.sessionId);
  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard/candidate/settings");
}

/** Déconnecter tous les appareils (y compris l'actuel) */
export async function revokeAllSessionsAction() {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login?revoked=1");

  await invalidateAllUserSessions(sessionData.user.id);
  await destroyCurrentSession();
  redirect("/login?revoked=1");
}

// ═══════════════════════════════════════════════════════════════
//  JOBS ACTIONS (MongoDB) - Enhanced with validation & activity logging
// ═══════════════════════════════════════════════════════════════

export async function saveJob(fd: FormData) {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");
  if (sessionData.user.role !== "entreprise") {
    throw new Error("Seules les entreprises peuvent créer des offres");
  }

  const db = await getDb();
  const id = String(fd.get("id") ?? "");
  const isUpdate = !!id;

  // Basic fields
  const title = String(fd.get("title") ?? "").trim();
  const location = String(fd.get("location") ?? "").trim();
  const type = String(fd.get("type") ?? "CDI").trim();
  const description = String(fd.get("description") ?? "").trim();
  const status = (String(fd.get("status") ?? "draft")) as "published" | "draft" | "closed";

  // Extended fields
  const category = String(fd.get("category") ?? "").trim() || undefined;
  const work_mode = String(fd.get("work_mode") ?? "").trim() || undefined;
  const experience_level = String(fd.get("experience_level") ?? "").trim() || undefined;
  
  // Salary
  const salary_min = fd.get("salary_min") ? Number(fd.get("salary_min")) : undefined;
  const salary_max = fd.get("salary_max") ? Number(fd.get("salary_max")) : undefined;
  const currency = String(fd.get("currency") ?? "TND").trim();
  
  // Deadline
  const application_deadline = String(fd.get("application_deadline") ?? "").trim() || undefined;
  
  // Arrays
  const rawSkills = String(fd.get("skills") ?? "").trim();
  const skills = rawSkills ? rawSkills.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  
  const rawRequirements = String(fd.get("requirements") ?? "").trim();
  const requirements = rawRequirements ? rawRequirements.split("\n").map((s) => s.trim()).filter(Boolean) : undefined;
  
  const rawResponsibilities = String(fd.get("responsibilities") ?? "").trim();
  const responsibilities = rawResponsibilities ? rawResponsibilities.split("\n").map((s) => s.trim()).filter(Boolean) : undefined;
  
  const rawBenefits = String(fd.get("benefits") ?? "").trim();
  const benefits = rawBenefits ? rawBenefits.split("\n").map((s) => s.trim()).filter(Boolean) : undefined;

  const now = new Date().toISOString();

  // Prepare job object
  const jobData: Partial<Job> = {
    title,
    location,
    type,
    description,
    status,
    category,
    work_mode: work_mode as any,
    experience_level: experience_level as any,
    salary_min,
    salary_max,
    currency,
    application_deadline,
    skills,
    requirements,
    responsibilities,
    benefits,
    updated_at: now,
  };

  // Validate if attempting to publish
  if (status === "published") {
    const { validateJobForPublishing } = await import("@/lib/jobs/validation");
    const errors = validateJobForPublishing(jobData);
    if (errors.length > 0) {
      // Store validation errors and keep as draft
      jobData.status = "draft";
      jobData.validation_errors = errors;
      
      // Save the draft first
      if (isUpdate) {
        await db.collection("jobs").updateOne(
          { id, company_id: sessionData.user.id },
          { $set: jobData }
        );
      } else {
        // Create new draft job
        const newJobId = crypto.randomUUID();
        const newJob: Job = {
          id: newJobId,
          company_id: sessionData.user.id,
          ...jobData,
          created_at: now,
          views_count: 0,
          applications_count: 0,
        } as Job;
        await db.collection("jobs").insertOne(newJob as any);
        jobId = newJobId;
      }
      
      // Log activity
      const { logJobActivity } = await import("@/lib/jobs/activities");
      await logJobActivity({
        jobId: isUpdate ? id : jobId,
        userId: sessionData.user.id,
        userName: sessionData.user.name,
        userRole: sessionData.user.role as any,
        action: isUpdate ? "updated" : "created",
      });
      
      revalidatePath("/dashboard/company/jobs");
      
      // Redirect with error message
      const errorMsg = encodeURIComponent(errors.join(", "));
      redirect(`/dashboard/company/jobs/${isUpdate ? id : jobId}?error=validation&msg=${errorMsg}`);
    } else {
      jobData.validation_errors = [];
      if (!isUpdate) {
        jobData.published_at = now;
      }
    }
  }

  jobData.last_validated_at = now;

  let jobId = id;

  if (isUpdate) {
    // Get previous state for activity logging
    const previousJob = await db.collection<Job>("jobs").findOne({
      id,
      company_id: sessionData.user.id,
    });

    if (!previousJob) {
      throw new Error("Offre non trouvée ou accès non autorisé");
    }

    // Update existing job
    await db.collection("jobs").updateOne(
      { id, company_id: sessionData.user.id },
      { $set: jobData }
    );

    // Log activity
    const { logJobActivity } = await import("@/lib/jobs/activities");
    await logJobActivity({
      jobId: id,
      userId: sessionData.user.id,
      userName: sessionData.user.name,
      userRole: sessionData.user.role as any,
      action: previousJob.status !== status ? "status_changed" : "updated",
      metadata: {
        previous_status: previousJob.status,
        new_status: status,
      },
    });
  } else {
    // Create new job
    jobId = crypto.randomUUID();
    const newJob: Job = {
      id: jobId,
      company_id: sessionData.user.id,
      ...jobData,
      created_at: now,
      views_count: 0,
      applications_count: 0,
    } as Job;

    await db.collection("jobs").insertOne(newJob as any);

    // Log activity
    const { logJobActivity } = await import("@/lib/jobs/activities");
    await logJobActivity({
      jobId,
      userId: sessionData.user.id,
      userName: sessionData.user.name,
      userRole: sessionData.user.role as any,
      action: "created",
    });
  }

  revalidatePath("/");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/company/jobs");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/jobs");
  revalidatePath(`/jobs/${jobId}`);
  
  // Redirect based on status
  if (status === "published") {
    redirect("/dashboard/company/jobs?success=published");
  } else {
    redirect(`/dashboard/company/jobs?success=saved`);
  }
}

export async function deleteJob(id: string) {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");

  const db = await getDb();
  
  // Get job to verify ownership
  const job = await db.collection<Job>("jobs").findOne({
    id,
    company_id: sessionData.user.id,
  });

  if (!job) {
    throw new Error("Offre non trouvée ou accès non autorisé");
  }

  // Delete the job
  await db.collection("jobs").deleteOne({ id, company_id: sessionData.user.id });

  // Log activity
  const { logJobActivity } = await import("@/lib/jobs/activities");
  await logJobActivity({
    jobId: id,
    userId: sessionData.user.id,
    userName: sessionData.user.name,
    userRole: sessionData.user.role as any,
    action: "deleted",
  });

  revalidatePath("/");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/admin");
}

/**
 * Change job status (draft -> published -> closed)
 */
export async function changeJobStatus(jobId: string, newStatus: "draft" | "published" | "closed") {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");

  const db = await getDb();
  
  // Get current job
  const job = await db.collection<Job>("jobs").findOne({
    id: jobId,
    company_id: sessionData.user.id,
  });

  if (!job) {
    redirect("/dashboard/company/jobs?error=not_found");
  }

  // Check if transition is allowed
  const { canTransitionStatus } = await import("@/lib/jobs/validation");
  const transition = canTransitionStatus(job.status, newStatus, job);

  if (!transition.allowed) {
    // Instead of throwing error, redirect with validation message
    const errorMsg = encodeURIComponent(transition.reason || "Transition non autorisée");
    redirect(`/dashboard/company/jobs?error=validation&msg=${errorMsg}`);
  }

  const now = new Date().toISOString();
  const updateData: any = {
    status: newStatus,
    updated_at: now,
  };

  // Set published_at on first publish
  if (newStatus === "published" && !job.published_at) {
    updateData.published_at = now;
  }

  // Set closed_at when closing
  if (newStatus === "closed") {
    updateData.closed_at = now;
  }

  // Clear validation errors on successful publish
  if (newStatus === "published") {
    updateData.validation_errors = [];
  }

  // Update job
  await db.collection("jobs").updateOne(
    { id: jobId },
    { $set: updateData }
  );

  // Log activity
  const { logJobActivity } = await import("@/lib/jobs/activities");
  const action = newStatus === "published" && job.status === "closed" ? "reopened" : newStatus;
  await logJobActivity({
    jobId,
    userId: sessionData.user.id,
    userName: sessionData.user.name,
    userRole: sessionData.user.role as any,
    action: action as any,
    metadata: {
      previous_status: job.status,
      new_status: newStatus,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/company/jobs");
  revalidatePath(`/jobs/${jobId}`);
  redirect("/dashboard/company/jobs?success=status_changed");
}

/**
 * Increment job views count
 */
export async function incrementJobViews(jobId: string) {
  try {
    const db = await getDb();
    await db.collection("jobs").updateOne(
      { id: jobId },
      { $inc: { views_count: 1 } }
    );
  } catch (error) {
    console.error("[Job] Failed to increment views:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
//  COMPANY & ADMIN ACTIONS (MongoDB)
// ═══════════════════════════════════════════════════════════════

/** Mise à jour du profil candidat */
export async function updateCandidateProfile(fd: FormData) {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");

  const db = await getDb();
  const fullName = String(fd.get("full_name") ?? "").trim();
  const title = String(fd.get("title") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  const city = String(fd.get("city") ?? "").trim();
  const school = String(fd.get("school") ?? "").trim();
  const educationLevel = String(fd.get("education_level") ?? "").trim();
  const bio = String(fd.get("bio") ?? "").trim();
  const rawSkills = String(fd.get("skills") ?? "").trim();
  const skills = rawSkills
    ? rawSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const githubUrl = String(fd.get("github_url") ?? "").trim();
  const linkedinUrl = String(fd.get("linkedin_url") ?? "").trim();
  const portfolioUrl = String(fd.get("portfolio_url") ?? "").trim();
  const availability = String(fd.get("availability") ?? "").trim();
  const visibleToCompanies =
    fd.get("visible_to_companies") === "on" ||
    fd.get("visible_to_companies") === "true";

  const now = new Date().toISOString();

  await db.collection("profiles").updateOne(
    { id: sessionData.user.id },
    {
      $set: {
        ...(fullName ? { full_name: fullName } : {}),
        title,
        phone,
        city,
        school,
        education_level: educationLevel,
        bio,
        skills,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        availability,
        visible_to_companies: visibleToCompanies,
        updated_at: now,
      },
    },
    { upsert: true }
  );

  if (fullName) {
    await db.collection("users").updateOne(
      { id: sessionData.user.id },
      { $set: { name: fullName, updated_at: now } }
    );
  }

  revalidatePath("/dashboard/candidate");
  revalidatePath("/dashboard/candidate/settings");
  redirect("/dashboard/candidate/settings?success=profile_updated");
}

/** Changement de mot de passe depuis les paramètres */
export async function updatePassword(fd: FormData) {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");

  const currentPassword = String(fd.get("current_password") ?? "");
  const newPassword = String(fd.get("new_password") ?? "");
  const confirmPassword = String(fd.get("confirm_password") ?? "");

  if (!newPassword || newPassword.length < 8) {
    redirect("/dashboard/candidate/settings?tab=security&error=password_too_short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/dashboard/candidate/settings?tab=security&error=password_mismatch");
  }

  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ id: sessionData.user.id });
  if (!user) redirect("/login");

  // Si l'utilisateur a un mot de passe local existant, vérifier l'actuel
  if (user.password_hash) {
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      redirect("/dashboard/candidate/settings?tab=security&error=invalid_current_password");
    }
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const now = new Date().toISOString();

  await db.collection("users").updateOne(
    { id: sessionData.user.id },
    { $set: { password_hash: newHash, updated_at: now } }
  );

  // Invalider les autres sessions pour sécuriser le compte après changement de mot de passe
  await revokeAllOtherSessions(sessionData.user.id, sessionData.sessionId);

  revalidatePath("/dashboard/candidate/settings");
  redirect("/dashboard/candidate/settings?tab=security&success=password_updated");
}

/** Mise à jour du profil entreprise */
export async function updateCompany(fd: FormData) {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");

  const db = await getDb();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) {
    redirect("/dashboard/company/edit?error=name_required");
  }

  const sector = String(fd.get("sector") ?? "").trim() || null;
  const rawSize = String(fd.get("size") ?? "").trim();
  const validSizes = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;
  const size = validSizes.includes(rawSize as any) ? (rawSize as any) : null;
  const city = String(fd.get("city") ?? "").trim() || null;
  const website = String(fd.get("website") ?? "").trim() || null;
  const description = String(fd.get("description") ?? "").trim() || null;
  const phone = String(fd.get("phone") ?? "").trim() || null;
  const linkedin_url = String(fd.get("linkedin_url") ?? "").trim() || null;
  const logo_url = String(fd.get("logo_url") ?? "").trim() || null;

  const now = new Date().toISOString();

  await db.collection("companies").updateOne(
    { id: sessionData.user.id },
    {
      $set: {
        name,
        sector,
        size,
        city,
        website,
        description,
        phone,
        linkedin_url,
        ...(logo_url ? { logo_url } : {}),
        updated_at: now,
      },
    },
    { upsert: true }
  );

  // Mettre à jour le nom dans la table users et profiles
  await db.collection("users").updateOne(
    { id: sessionData.user.id },
    { $set: { name, company_name: name, updated_at: now } }
  );
  await db.collection("profiles").updateOne(
    { id: sessionData.user.id },
    { $set: { full_name: name, updated_at: now } }
  );

  revalidatePath("/");
  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/company/edit");
  revalidatePath("/dashboard/candidate/companies");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/company");
}

/** Admin valide une entreprise */
export async function verifyCompany(id: string) {
  const sessionData = await getSessionUser();
  if (!sessionData || sessionData.user.role !== "admin") {
    throw new Error("Action non autorisée : droits administrateur requis.");
  }

  const db = await getDb();
  await db.collection("companies").updateOne(
    { id },
    { $set: { status: "verified", rejection_reason: null, updated_at: new Date().toISOString() } }
  );

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/companies");
  revalidatePath("/dashboard/candidate/companies");
}

/** Admin rejette une entreprise */
export async function rejectCompany(
  id: string,
  reason: string = "Dossier incomplet ou non conforme aux conditions d'utilisation"
) {
  const sessionData = await getSessionUser();
  if (!sessionData || sessionData.user.role !== "admin") {
    throw new Error("Action non autorisée : droits administrateur requis.");
  }

  const db = await getDb();
  await db.collection("companies").updateOne(
    { id },
    {
      $set: {
        status: "rejected",
        rejection_reason: reason || "Dossier non validé",
        updated_at: new Date().toISOString(),
      },
    }
  );

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/companies");
}

/** Admin supprime une entreprise */
export async function adminDeleteCompany(id: string) {
  const sessionData = await getSessionUser();
  if (!sessionData || sessionData.user.role !== "admin") {
    throw new Error("Action non autorisée : droits administrateur requis.");
  }

  const db = await getDb();
  await db.collection("jobs").deleteMany({ company_id: id });
  await db.collection("companies").deleteOne({ id });

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/companies");
  revalidatePath("/dashboard/candidate/companies");
}

/** Admin modifie une entreprise */
export async function adminUpdateCompany(fd: FormData) {
  const sessionData = await getSessionUser();
  if (!sessionData || sessionData.user.role !== "admin") {
    throw new Error("Action non autorisée.");
  }

  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const sector = String(fd.get("sector") ?? "").trim() || null;
  const city = String(fd.get("city") ?? "").trim() || null;
  const status = String(fd.get("status") ?? "verified") as "pending" | "verified" | "rejected";
  const website = String(fd.get("website") ?? "").trim() || null;
  const description = String(fd.get("description") ?? "").trim() || null;

  if (!id || !name) throw new Error("ID et nom requis.");

  const db = await getDb();
  await db.collection("companies").updateOne(
    { id },
    {
      $set: {
        name,
        sector,
        city,
        status,
        website,
        description,
        updated_at: new Date().toISOString(),
      },
    }
  );

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/companies");
}

/** Admin change le rôle d'un utilisateur */
export async function adminUpdateUserRole(userId: string, newRole: string) {
  const sessionData = await getSessionUser();
  if (!sessionData || sessionData.user.role !== "admin") {
    throw new Error("Action non autorisée.");
  }

  if (!["candidat", "entreprise", "admin"].includes(newRole)) {
    throw new Error("Rôle invalide");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection("users").updateOne(
    { id: userId },
    { $set: { role: newRole, updated_at: now } }
  );
  await db.collection("profiles").updateOne(
    { id: userId },
    { $set: { role: newRole, updated_at: now } }
  );

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
}

/** Admin supprime un utilisateur / profil */
export async function adminDeleteUser(userId: string) {
  const sessionData = await getSessionUser();
  if (!sessionData || sessionData.user.role !== "admin") {
    throw new Error("Action non autorisée.");
  }

  const db = await getDb();
  await db.collection("users").deleteOne({ id: userId });
  await db.collection("profiles").deleteOne({ id: userId });
  await db.collection("jobs").deleteMany({ company_id: userId });
  await db.collection("companies").deleteOne({ id: userId });
  await db.collection("sessions").deleteMany({ user_id: userId });
  await db.collection("consent_records").deleteMany({ user_id: userId });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/companies");
}

/** Admin modifie le statut d'une offre */
export async function adminUpdateJobStatus(jobId: string, status: string) {
  const sessionData = await getSessionUser();
  if (!sessionData || sessionData.user.role !== "admin") {
    throw new Error("Action non autorisée.");
  }

  const db = await getDb();
  await db.collection("jobs").updateOne(
    { id: jobId },
    { $set: { status, updated_at: new Date().toISOString() } }
  );

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/jobs");
}

/** Admin supprime une offre */
export async function adminDeleteJob(jobId: string) {
  const sessionData = await getSessionUser();
  if (!sessionData || sessionData.user.role !== "admin") {
    throw new Error("Action non autorisée.");
  }

  const db = await getDb();
  await db.collection("jobs").deleteOne({ id: jobId });

  revalidatePath("/");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/jobs");
}

/** Promouvoir l'utilisateur connecté en Super Admin */
export async function promoteSelfToAdmin() {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");

  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection("users").updateOne(
    { id: sessionData.user.id },
    { $set: { role: "admin", updated_at: now } }
  );
  await db.collection("profiles").updateOne(
    { id: sessionData.user.id },
    { $set: { role: "admin", updated_at: now } }
  );

  // Recréer la session avec le nouveau rôle
  await createSession({
    id: sessionData.user.id,
    email: sessionData.user.email,
    name: sessionData.user.name,
    role: "admin",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin");
}
