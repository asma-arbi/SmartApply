import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { JobActivity, JobActivityAction, UserRole } from "@/lib/models/types";
import { headers } from "next/headers";

/**
 * Get client IP address from request headers
 */
function getClientIp(): string {
  try {
    const h = headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = h.get("x-real-ip");
    if (realIp) return realIp.trim();
  } catch {}
  return "127.0.0.1";
}

/**
 * Log a job activity to the audit trail
 */
export async function logJobActivity(params: {
  jobId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: JobActivityAction;
  changes?: Record<string, any>;
  metadata?: JobActivity["metadata"];
}): Promise<void> {
  try {
    const db = await getDb();
    
    const activity: JobActivity = {
      id: crypto.randomUUID(),
      job_id: params.jobId,
      user_id: params.userId,
      user_name: params.userName,
      user_role: params.userRole,
      action: params.action,
      changes: params.changes,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
      ip: getClientIp(),
    };

    await db.collection("job_activities").insertOne(activity as any);
  } catch (error) {
    // Log error but don't fail the main operation
    console.error("[JobActivity] Failed to log activity:", error);
  }
}

/**
 * Get activity timeline for a job
 */
export async function getJobActivities(
  jobId: string,
  limit: number = 20
): Promise<JobActivity[]> {
  const db = await getDb();
  
  const activities = await db
    .collection<JobActivity>("job_activities")
    .find({ job_id: jobId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return activities;
}

/**
 * Get recent activities for a user (for their dashboard)
 */
export async function getUserJobActivities(
  userId: string,
  limit: number = 10
): Promise<JobActivity[]> {
  const db = await getDb();
  
  const activities = await db
    .collection<JobActivity>("job_activities")
    .find({ user_id: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return activities;
}

/**
 * Get company-wide job activities (for admin or company dashboard)
 */
export async function getCompanyJobActivities(
  companyId: string,
  limit: number = 20
): Promise<JobActivity[]> {
  const db = await getDb();
  
  // Get all jobs for this company
  const jobs = await db
    .collection("jobs")
    .find({ company_id: companyId }, { projection: { id: 1 } })
    .toArray();
  
  const jobIds = jobs.map((job) => job.id);
  
  if (jobIds.length === 0) {
    return [];
  }

  const activities = await db
    .collection<JobActivity>("job_activities")
    .find({ job_id: { $in: jobIds } })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return activities;
}

/**
 * Format activity action for display
 */
export function formatActivityAction(action: JobActivityAction): string {
  const actionLabels: Record<JobActivityAction, string> = {
    created: "a créé l'offre",
    updated: "a modifié l'offre",
    published: "a publié l'offre",
    closed: "a clôturé l'offre",
    reopened: "a réouvert l'offre",
    deleted: "a supprimé l'offre",
    status_changed: "a changé le statut",
  };

  return actionLabels[action] || action;
}

/**
 * Format relative time for activity display
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
