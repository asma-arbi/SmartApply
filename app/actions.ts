"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateJobForPublish } from "@/lib/validations/job-validation";
import { 
  logActivity, 
  generateUpdateMetadata, 
  generateStatusTransitionMetadata,
  generateChangeDescription,
  detectChanges
} from "@/lib/activity-logger";

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
  if (id) {
    // Update existing job
    // Fetch previous values and update in a single transaction-like pattern
    const { data: previousJob } = await supabase
      .from("jobs")
      .select("title, location, type, description, status")
      .eq("id", id)
      .single();
    
    // Update and log activity in parallel
    await Promise.all([
      supabase.from("jobs").update(values).eq("id", id),
      previousJob ? (async () => {
        const changes = detectChanges(previousJob, values);
        if (changes.length > 0) {
          const metadata = generateUpdateMetadata(previousJob, values);
          const changeDescription = generateChangeDescription(metadata.changes || []);
          
          await logActivity({
            jobId: id,
            companyId: user.id,
            actorId: user.id,
            actionType: 'updated',
            description: `Offre modifiée - ${changeDescription}`,
            metadata,
          });
        }
      })() : Promise.resolve()
    ]);
  } else {
    // Create new job
    const { data: newJob } = await supabase
      .from("jobs")
      .insert({ ...values, company_id: user.id })
      .select("id")
      .single();
    
    // Log activity in background (non-blocking)
    if (newJob) {
      logActivity({
        jobId: newJob.id,
        companyId: user.id,
        actorId: user.id,
        actionType: 'created',
        description: 'Offre créée',
        metadata: {
          current: values,
        },
      }).catch(() => {}); // Don't block on logging errors
    }
  }
  
  revalidatePath("/");
  redirect("/dashboard");
}

export async function deleteJob(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Fetch job details and log activity in parallel with deletion
    const { data: job } = await supabase
      .from("jobs")
      .select("title, status, type, location")
      .eq("id", id)
      .eq("company_id", user.id)
      .single();
    
    // Perform deletion and logging in parallel
    await Promise.all([
      supabase.from("jobs").delete().eq("id", id),
      job ? logActivity({
        jobId: id,
        companyId: user.id,
        actorId: user.id,
        actionType: 'deleted',
        description: `Offre supprimée : ${job.title}`,
        metadata: {
          previous: {
            title: job.title,
            status: job.status,
            type: job.type,
            location: job.location,
          },
        },
      }) : Promise.resolve()
    ]);
  } else {
    // If no user, just delete
    await createClient().from("jobs").delete().eq("id", id);
  }
  
  revalidatePath("/");
  revalidatePath("/dashboard");
}

// New lifecycle actions
export async function publishJob(jobId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Fetch job to verify ownership and get data
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", user.id)
    .single();

  if (fetchError || !job) {
    return { success: false, error: "Offre non trouvée ou accès refusé" };
  }

  // Validate job data
  const validation = validateJobForPublish(job);
  
  if (!validation.isValid) {
    const errorMessages = Object.values(validation.errors).join(", ");
    return { 
      success: false, 
      error: `Validation échouée: ${errorMessages}`,
      validationErrors: validation.errors
    };
  }

  // Update status to published and log activity in parallel
  const [updateResult] = await Promise.all([
    supabase
      .from("jobs")
      .update({ status: "published" })
      .eq("id", jobId)
      .eq("company_id", user.id),
    logActivity({
      jobId,
      companyId: user.id,
      actorId: user.id,
      actionType: 'published',
      description: 'Offre publiée',
      metadata: generateStatusTransitionMetadata(job.status, 'published'),
    })
  ]);

  if (updateResult.error) {
    return { success: false, error: "Erreur lors de la publication" };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function closeJob(jobId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Verify ownership and current status
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .eq("company_id", user.id)
    .single();

  if (fetchError || !job) {
    return { success: false, error: "Offre non trouvée ou accès refusé" };
  }

  if (job.status !== "published") {
    return { success: false, error: "Seules les offres publiées peuvent être clôturées" };
  }

  // Update status and log activity in parallel
  const [updateResult] = await Promise.all([
    supabase
      .from("jobs")
      .update({ status: "closed" })
      .eq("id", jobId)
      .eq("company_id", user.id),
    logActivity({
      jobId,
      companyId: user.id,
      actorId: user.id,
      actionType: 'closed',
      description: 'Offre clôturée',
      metadata: generateStatusTransitionMetadata('published', 'closed'),
    })
  ]);

  if (updateResult.error) {
    return { success: false, error: "Erreur lors de la clôture" };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reopenJob(jobId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Verify ownership and current status
  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("company_id", user.id)
    .single();

  if (fetchError || !job) {
    return { success: false, error: "Offre non trouvée ou accès refusé" };
  }

  if (job.status !== "closed") {
    return { success: false, error: "Seules les offres clôturées peuvent être réouvertes" };
  }

  // Validate job data before reopening
  const validation = validateJobForPublish(job);
  
  if (!validation.isValid) {
    const errorMessages = Object.values(validation.errors).join(", ");
    return { 
      success: false, 
      error: `Impossible de rouvrir: ${errorMessages}`,
      validationErrors: validation.errors
    };
  }

  // Update status and log activity in parallel
  const [updateResult] = await Promise.all([
    supabase
      .from("jobs")
      .update({ status: "published" })
      .eq("id", jobId)
      .eq("company_id", user.id),
    logActivity({
      jobId,
      companyId: user.id,
      actorId: user.id,
      actionType: 'reopened',
      description: 'Offre réouverte',
      metadata: generateStatusTransitionMetadata('closed', 'published'),
    })
  ]);

  if (updateResult.error) {
    return { success: false, error: "Erreur lors de la réouverture" };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: true };
}
