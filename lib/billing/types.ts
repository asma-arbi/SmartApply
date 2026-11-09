/**
 * lib/billing/types.ts
 *
 * Types TypeScript pour le module Billing (Stripe + Plans).
 */

export type BillingPlan = "free" | "pro";

export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export const PRO_ACTIVE_STATUSES: StripeSubscriptionStatus[] = [
  "active",
  "trialing",
];

export interface StripeSubscription {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: StripeSubscriptionStatus | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  updatedAt: string;
  advisorQuotaUsed: number;
  advisorQuotaDate: string | null;
  advisorCache: string | null;
  advisorCacheHash: string | null;
}

export interface PlanMetrics {
  plan: BillingPlan;
  publishedJobs: number;
  maxJobs: number;
  status: StripeSubscriptionStatus | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}
