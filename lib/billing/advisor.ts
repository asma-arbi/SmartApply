/**
 * lib/billing/advisor.ts
 *
 * Conseiller IA pour les plans d'abonnement.
 * Utilise Gemini si disponible, sinon un conseil statique.
 */

import type { PlanMetrics } from "./types";

interface AdvisorResult {
  ok: boolean;
  advice: string;
  fromAi: boolean;
}

// ─── Conseil statique (fallback) ──────────────────────────────────────────

function staticAdvice(metrics: PlanMetrics): string {
  if (metrics.plan === "free") {
    if (metrics.publishedJobs >= metrics.maxJobs) {
      return `Vous avez atteint la limite de ${metrics.maxJobs} offre(s) sur le plan Gratuit. Passez au plan Pro pour publier des offres illimitées et accéder à des fonctionnalités avancées comme le conseiller IA et les analytics.`;
    }
    return `Vous utilisez ${metrics.publishedJobs}/${metrics.maxJobs} offre(s) sur votre plan Gratuit. Le plan Pro vous permettrait de publier des offres illimitées et d'accéder à des candidats qualifiés en priorité.`;
  }

  if (metrics.cancelAtPeriodEnd) {
    return `Votre abonnement Pro est programmé pour se terminer le ${metrics.currentPeriodEnd ? new Date(metrics.currentPeriodEnd).toLocaleDateString("fr-FR") : "bientôt"}. Pour maintenir l'accès aux offres illimitées, gérez votre abonnement depuis le portail.`;
  }

  if (metrics.status === "past_due") {
    return `Votre paiement a échoué. Mettez à jour vos informations de paiement pour éviter l'interruption de votre plan Pro et continuer à publier des offres.`;
  }

  return `Vous bénéficiez du plan Pro avec ${metrics.publishedJobs} offre(s) active(s). Continuez à tirer profit des fonctionnalités avancées pour attirer les meilleurs candidats.`;
}

// ─── Conseil IA ───────────────────────────────────────────────────────────

export async function getAdvisorAdvice(
  metrics: PlanMetrics
): Promise<AdvisorResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return { ok: true, advice: staticAdvice(metrics), fromAi: false };
  }

  try {
    const prompt = `Tu es un conseiller expert en recrutement pour SmartApply Tunisia. 
Génère un conseil personnalisé et actionnable (2-3 phrases max, en français) pour cette entreprise :

Plan: ${metrics.plan === "pro" ? "Pro (payant)" : "Gratuit"}
Offres publiées: ${metrics.publishedJobs}/${metrics.plan === "pro" ? "illimité" : metrics.maxJobs}
Statut Stripe: ${metrics.status ?? "non abonné"}
Résiliation programmée: ${metrics.cancelAtPeriodEnd ? "oui" : "non"}

Sois direct, professionnel et positif. Pas de titre, juste le texte.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

    const data = await res.json();
    const advice = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!advice) throw new Error("Réponse vide de Gemini");

    return { ok: true, advice, fromAi: true };
  } catch (err) {
    console.error("[AdvisorAI] Erreur :", (err as Error).message);
    return { ok: true, advice: staticAdvice(metrics), fromAi: false };
  }
}
