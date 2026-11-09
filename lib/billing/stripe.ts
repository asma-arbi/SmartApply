/**
 * lib/billing/stripe.ts
 *
 * Client Stripe et helpers pour Checkout / Portal / Webhook.
 * Les clés Stripe sont lues depuis les variables d'environnement.
 */

import Stripe from "stripe";

// ─── Instance Stripe ───────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY n'est pas défini dans les variables d'environnement."
    );
  }
  return new Stripe(key, { apiVersion: "2026-10-28.endive" as any });
}

// ─── URL du site ───────────────────────────────────────────────────────────

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

// ─── Créer ou récupérer un customer Stripe ────────────────────────────────

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string,
  existingCustomerId: string | null
): Promise<string> {
  const stripe = getStripe();

  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return existingCustomerId;
    } catch {
      // Customer not found — créer un nouveau
    }
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });

  return customer.id;
}

// ─── Créer une session Checkout ───────────────────────────────────────────

export async function createCheckoutSession(
  stripeCustomerId: string,
  userId: string
): Promise<string> {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID ou STRIPE_PRO_PRICE_ID n'est pas défini.");
  }

  const siteUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/dashboard/company/abonnement?status=pending&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard/company/abonnement?status=cancelled`,
    metadata: { userId },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: {
      metadata: { userId },
    },
  });

  if (!session.url) {
    throw new Error("Impossible de créer la session de paiement Stripe.");
  }

  return session.url;
}

// ─── Créer une session du portail client Stripe ───────────────────────────

export async function createPortalSession(
  stripeCustomerId: string
): Promise<string> {
  const stripe = getStripe();
  const siteUrl = getSiteUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${siteUrl}/dashboard/company/abonnement`,
  });

  return session.url;
}

// ─── Construire un événement Webhook Stripe ───────────────────────────────

export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET n'est pas défini.");
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
