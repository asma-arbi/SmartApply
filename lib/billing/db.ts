/**
 * lib/billing/db.ts
 *
 * Couche d'accès MongoDB pour le module Billing.
 * Stocke et lit les abonnements Stripe.
 */

import { getDb } from "@/lib/mongodb";
import crypto from "crypto";
import type { StripeSubscription } from "./types";

const COLLECTION = "stripe_subscriptions";
export const ADVISOR_DAILY_QUOTA = 3;

// ─── Initialisation des index ──────────────────────────────────────────────

export async function initBillingIndexes(): Promise<void> {
  try {
    const db = await getDb();
    const col = db.collection(COLLECTION);
    await Promise.all([
      col.createIndex({ userId: 1 }, { unique: true }),
      col.createIndex({ stripeCustomerId: 1 }),
      col.createIndex({ stripeSubscriptionId: 1 }),
    ]);
  } catch {
    // Idempotent
  }
}

// ─── Lire l'abonnement d'un utilisateur ───────────────────────────────────

export async function getSubscription(
  userId: string
): Promise<StripeSubscription | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ userId });
  if (!doc) return null;
  const { _id, ...rest } = doc as any;
  return rest as StripeSubscription;
}

// ─── Créer ou mettre à jour le customerId Stripe ─────────────────────────

export async function upsertStripeCustomer(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { userId },
    {
      $set: {
        stripeCustomerId,
        updatedAt: new Date().toISOString(),
      },
      $setOnInsert: {
        userId,
        stripeSubscriptionId: null,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        priceId: null,
        advisorQuotaUsed: 0,
        advisorQuotaDate: null,
        advisorCache: null,
        advisorCacheHash: null,
      },
    },
    { upsert: true }
  );
}

// ─── Mettre à jour l'abonnement depuis un webhook Stripe ──────────────────

export async function upsertSubscriptionFromStripe(data: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { stripeCustomerId: data.stripeCustomerId },
    {
      $set: {
        stripeSubscriptionId: data.stripeSubscriptionId,
        status: data.status,
        currentPeriodEnd: new Date(data.currentPeriodEnd * 1000).toISOString(),
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        priceId: data.priceId,
        updatedAt: new Date().toISOString(),
      },
    }
  );
}

// ─── Vérifier et incrémenter le quota du conseiller IA ───────────────────

export async function checkAndIncrementAdvisorQuota(
  userId: string
): Promise<boolean> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const doc = await db.collection(COLLECTION).findOne({ userId });

  if (!doc) return false;

  if (doc.advisorQuotaDate === today && doc.advisorQuotaUsed >= ADVISOR_DAILY_QUOTA) {
    return false;
  }

  const reset = doc.advisorQuotaDate !== today;
  await db.collection(COLLECTION).updateOne(
    { userId },
    {
      $set: {
        advisorQuotaDate: today,
        advisorQuotaUsed: reset ? 1 : doc.advisorQuotaUsed + 1,
      },
    }
  );

  return true;
}

// ─── Cache du conseil IA ──────────────────────────────────────────────────

export async function getCachedAdvice(
  userId: string,
  metricsHash: string
): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ userId });
  if (!doc) return null;
  if (doc.advisorCacheHash === metricsHash && doc.advisorCache) {
    return doc.advisorCache as string;
  }
  return null;
}

export async function saveAdviceCache(
  userId: string,
  metricsHash: string,
  advice: string
): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).updateOne(
    { userId },
    {
      $set: {
        advisorCache: advice,
        advisorCacheHash: metricsHash,
      },
    }
  );
}

export function hashMetrics(metricsJson: string): string {
  return crypto.createHash("sha256").update(metricsJson).digest("hex");
}

// ─── Récupérer l'userId depuis stripeCustomerId ───────────────────────────

export async function getUserIdByStripeCustomerId(
  stripeCustomerId: string
): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ stripeCustomerId });
  return doc?.userId ?? null;
}
