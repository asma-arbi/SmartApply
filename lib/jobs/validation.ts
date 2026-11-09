import { Job } from "@/lib/models/types";

/**
 * Validation rules for publishing a job
 * A job must meet these criteria to be published
 */
export function validateJobForPublishing(job: Partial<Job>): string[] {
  const errors: string[] = [];

  // Required fields
  if (!job.title?.trim()) {
    errors.push("Titre requis");
  } else if (job.title.trim().length < 5) {
    errors.push("Titre trop court (min. 5 caractères)");
  }

  if (!job.description?.trim()) {
    errors.push("Description requise");
  } else if (job.description.trim().length < 10) {
    errors.push("Description trop courte (min. 10 caractères)");
  }

  if (!job.location?.trim()) {
    errors.push("Localisation requise");
  }

  if (!job.type?.trim()) {
    errors.push("Type de contrat requis");
  }

  // Category should be provided
  if (!job.category?.trim()) {
    errors.push("Catégorie recommandée");
  }

  // Skills array should have at least one skill for better matching
  if (!job.skills || job.skills.length === 0) {
    errors.push("Ajoutez au moins une compétence");
  }

  // Salary validation if provided
  if (job.salary_min !== undefined && job.salary_max !== undefined) {
    if (job.salary_min > job.salary_max) {
      errors.push("Salaire min > salaire max");
    }
    if (job.salary_min < 0 || job.salary_max < 0) {
      errors.push("Salaires doivent être positifs");
    }
  }

  // Application deadline validation
  if (job.application_deadline) {
    const deadline = new Date(job.application_deadline);
    const now = new Date();
    if (deadline < now) {
      errors.push("Date limite dans le passé");
    }
  }

  return errors;
}

/**
 * Check if a job can transition to a new status
 */
export function canTransitionStatus(
  currentStatus: string,
  newStatus: string,
  job: Partial<Job>
): { allowed: boolean; reason?: string } {
  // Draft -> Published: requires validation
  if (currentStatus === "draft" && newStatus === "published") {
    const errors = validateJobForPublishing(job);
    if (errors.length > 0) {
      return {
        allowed: false,
        reason: `Validation échouée: ${errors.join(", ")}`,
      };
    }
    return { allowed: true };
  }

  // Published -> Closed: always allowed
  if (currentStatus === "published" && newStatus === "closed") {
    return { allowed: true };
  }

  // Closed -> Published: allowed to reopen
  if (currentStatus === "closed" && newStatus === "published") {
    const errors = validateJobForPublishing(job);
    if (errors.length > 0) {
      return {
        allowed: false,
        reason: `Validation échouée: ${errors.join(", ")}`,
      };
    }
    return { allowed: true };
  }

  // Any -> Draft: always allowed (for editing)
  if (newStatus === "draft") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Transition de ${currentStatus} vers ${newStatus} non autorisée`,
  };
}

/**
 * Job categories for Tunisia job market
 */
export const JOB_CATEGORIES = [
  "Développement",
  "Design",
  "Marketing",
  "Data Science",
  "DevOps",
  "Product Management",
  "Sales",
  "Support Client",
  "Ressources Humaines",
  "Finance",
  "Autre",
] as const;

/**
 * Job types common in Tunisia
 */
export const JOB_TYPES = [
  "CDI",
  "CDD",
  "Stage PFE",
  "Stage",
  "Freelance",
  "Temps plein",
  "Temps partiel",
] as const;

/**
 * Experience levels
 */
export const EXPERIENCE_LEVELS = [
  { value: "internship", label: "Stage" },
  { value: "junior", label: "Junior (0-2 ans)" },
  { value: "mid", label: "Intermédiaire (2-5 ans)" },
  { value: "senior", label: "Senior (5+ ans)" },
  { value: "lead", label: "Lead / Manager" },
] as const;

/**
 * Work modes
 */
export const WORK_MODES = [
  { value: "onsite", label: "Sur site" },
  { value: "hybrid", label: "Hybride" },
  { value: "remote", label: "Télétravail" },
] as const;

/**
 * Currencies
 */
export const CURRENCIES = [
  { value: "TND", label: "TND (Dinar Tunisien)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "USD", label: "USD (Dollar)" },
] as const;
