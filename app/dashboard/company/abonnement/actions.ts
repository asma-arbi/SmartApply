"use server";

/**
 * app/dashboard/company/abonnement/actions.ts
 *
 * Server Actions du module Abonnement.
 *
 * SÉCURITÉ (vérifiée dans chaque action) :
 *  1. Session valide  → sinon reject
 *  2. Rôle "entreprise" → sinon reject
 *  3. userId toujours issu de la session, jamais du client
 *  4. customerId toujours issu de la base, jamais du client
 *  5. Prix et URLs construits côté serveur uniquement
 */

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import {
  getSubscription,
  checkAndIncrementAdvisorQuota,
  getCachedAdvice,
  saveAdviceCache,
  hashMetrics,
  ADVISOR_DAILY_QUOTA,
} from "@/lib/billing/db";
import { getOrCreateStripeCustomer, createCheckoutSession, createPortalSession } from "@/lib/billing/stripe";
import { upsertStripeCustomer } from "@/lib/billing/db";
import { getAdvisorAdvice } from "@/lib/billing/advisor";
import { getPlan, FREE_MAX_PUBLISHED_JOBS } from "@/lib/billing/plans";
import { getDb } from "@/lib/mongodb";
import type { PlanMetrics } from "@/lib/billing/types";

// ─── Vérification session + rôle (helper interne) ────────────────────────────

async function requireEntreprise() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.user.role !== "entreprise") redirect("/access-denied");
  return session.user;
}

// ─── A1 : Lancer le Checkout Stripe ──────────────────────────────────────────

export async function startCheckout(): Promise<{ ok: false; error: string } | never> {
  const user = await requireEntreprise();

  try {
    // Récupère le customerId existant en base (jamais du client)
    const sub = await getSubscription(user.id);
    const existingCustomerId = sub?.stripeCustomerId ?? null;

    // Récupère ou crée un client Stripe
    const stripeCustomerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.name,
      existingCustomerId
    );

    // Stocke le customerId en base (upsert thread-safe)
    await upsertStripeCustomer(user.id, stripeCustomerId);

    // Crée la session Checkout
    const checkoutUrl = await createCheckoutSession(stripeCustomerId, user.id);

    // Redirige vers Stripe
    redirect(checkoutUrl);
  } catch (err) {
    const msg = (err as Error).message;
    // redirect() lève une exception Next.js — il ne faut pas la capturer
    if (msg === "NEXT_REDIRECT") throw err;
    console.error("[startCheckout] Erreur :", msg);
    return { ok: false, error: "Impossible de démarrer le paiement. Réessayez plus tard." };
  }
}

// ─── A2 : Ouvrir le portail client Stripe ────────────────────────────────────

export async function openPortal(): Promise<{ ok: false; error: string } | never> {
  const user = await requireEntreprise();

  try {
    const sub = await getSubscription(user.id);

    if (!sub?.stripeCustomerId) {
      return {
        ok: false,
        error: "Aucun abonnement Stripe trouvé. Veuillez d'abord souscrire au plan Pro.",
      };
    }

    // customerId vient TOUJOURS de la base, jamais du client
    const portalUrl = await createPortalSession(sub.stripeCustomerId);
    redirect(portalUrl);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "NEXT_REDIRECT") throw err;
    console.error("[openPortal] Erreur :", msg);
    return { ok: false, error: "Impossible d'ouvrir le portail. Réessayez plus tard." };
  }
}

// ─── A3 : Obtenir un conseil IA sur le plan ───────────────────────────────────

export type AdviceResult =
  | { ok: true; advice: string; fromAi: boolean; quotaRemaining: number }
  | { ok: false; error: "quota_exceeded" | "unavailable" };

export async function getAdvice(): Promise<AdviceResult> {
  const user = await requireEntreprise();

  try {
    const db = await getDb();
    const plan = await getPlan(user.id);
    const sub = await getSubscription(user.id);

    // Métriques anonymisées (jamais d'email/nom)
    const publishedJobs = await db
      .collection("jobs")
      .countDocuments({ company_id: user.id, status: "published" });

    const metrics: PlanMetrics = {
      plan,
      publishedJobs,
      maxJobs: FREE_MAX_PUBLISHED_JOBS,
      status: sub?.status ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    };

    // Vérifier le cache (24 h, même métriques)
    const metricsJson = JSON.stringify(metrics);
    const metricsHash = hashMetrics(metricsJson);
    const cached = await getCachedAdvice(user.id, metricsHash);

    if (cached) {
      return { ok: true, advice: cached, fromAi: false, quotaRemaining: ADVISOR_DAILY_QUOTA };
    }

    // Vérifier et incrémenter le quota
    const allowed = await checkAndIncrementAdvisorQuota(user.id);
    if (!allowed) {
      return { ok: false, error: "quota_exceeded" };
    }

    // Appel IA
    const result = await getAdvisorAdvice(metrics);

    if (!result.ok) {
      return { ok: false, error: "unavailable" };
    }

    // Sauvegarder en cache
    await saveAdviceCache(user.id, metricsHash, result.advice);

    return {
      ok: true,
      advice: result.advice,
      fromAi: result.fromAi,
      quotaRemaining: ADVISOR_DAILY_QUOTA - 1,
    };
  } catch (err) {
    console.error("[getAdvice] Erreur :", (err as Error).message);
    return { ok: false, error: "unavailable" };
  }
}
