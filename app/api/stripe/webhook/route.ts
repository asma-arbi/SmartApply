/**
 * app/api/stripe/webhook/route.ts
 *
 * Endpoint de réception des webhooks Stripe.
 * Sécurisé par signature Stripe (STRIPE_WEBHOOK_SECRET).
 * Traitements : subscription.created, updated, deleted, payment_intent...
 */

import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/billing/stripe";
import { upsertSubscriptionFromStripe, getUserIdByStripeCustomerId } from "@/lib/billing/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    const body = await req.arrayBuffer();
    const payload = Buffer.from(body);
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("[Stripe Webhook] Signature invalide :", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        await upsertSubscriptionFromStripe({
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          priceId: sub.items?.data?.[0]?.price?.id ?? null,
        });
        console.log(`[Stripe Webhook] Subscription ${event.type}: ${sub.id} → ${sub.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await upsertSubscriptionFromStripe({
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          status: "canceled",
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: false,
          priceId: null,
        });
        console.log(`[Stripe Webhook] Subscription deleted: ${sub.id}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        // La mise à jour du statut se fait via customer.subscription.updated
        console.log(`[Stripe Webhook] Invoice paid: ${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        console.warn(`[Stripe Webhook] Invoice payment failed: ${invoice.id} — customer: ${invoice.customer}`);
        break;
      }

      default:
        // Ignorer les événements non traités
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Erreur de traitement :", (err as Error).message);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}
