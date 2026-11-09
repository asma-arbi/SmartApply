/**
 * lib/billing/plans.ts
 *
 * Configuration des plans tarifaires SmartApply.
 */

import type { BillingPlan } from "./types";

/** Nombre maximum d'offres publiées sur le plan gratuit */
export const FREE_MAX_PUBLISHED_JOBS = 1;

/** Nombre maximum illimité côté Pro (10 000 en pratique) */
export const PRO_MAX_PUBLISHED_JOBS = 10_000;

export const PLAN_DESCRIPTIONS: Record<BillingPlan, string> = {
  free: "Plan Gratuit — 1 offre publiée maximum",
  pro: "Plan Pro — Offres illimitées + fonctionnalités avancées",
};

export const PLAN_FEATURES: Record<BillingPlan, string[]> = {
  free: [
    "1 offre publiée",
    "Accès aux candidatures",
    "Messagerie intégrée",
    "Support standard",
  ],
  pro: [
    "Offres illimitées",
    "Accès prioritaire aux candidats",
    "Conseiller IA personnalisé",
    "Support prioritaire",
    "Analytics avancés",
    "Badge entreprise vérifiée",
  ],
};

/**
 * Retourne le plan actuel d'une entreprise selon les données Stripe.
 */
import { getSubscription } from "./db";
import { PRO_ACTIVE_STATUSES } from "./types";

export async function getPlan(userId: string): Promise<BillingPlan> {
  const sub = await getSubscription(userId);
  if (sub?.status && PRO_ACTIVE_STATUSES.includes(sub.status as any)) {
    return "pro";
  }
  return "free";
}

/**
 * Vérifie si une entreprise peut publier une nouvelle offre.
 * Retourne { allowed: true } ou { allowed: false, reason: string }
 */
export async function canPublishJob(
  userId: string,
  currentPublishedCount: number
): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getPlan(userId);

  if (plan === "pro") {
    return { allowed: true };
  }

  if (currentPublishedCount >= FREE_MAX_PUBLISHED_JOBS) {
    return {
      allowed: false,
      reason: `Le plan gratuit est limité à ${FREE_MAX_PUBLISHED_JOBS} offre publiée. Passez au plan Pro pour publier des offres illimitées.`,
    };
  }

  return { allowed: true };
}
