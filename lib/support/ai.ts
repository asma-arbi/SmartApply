/**
 * lib/support/ai.ts
 *
 * Classification IA des tickets (catégorie + urgence).
 * Utilise Gemini si disponible, sinon un fallback par mots-clés.
 * Ne lève jamais d'exception — toujours un résultat.
 */

import type { TicketCategory, TicketUrgency } from "./types";

interface ClassifyResult {
  category: TicketCategory;
  urgency: TicketUrgency;
  usedAi: boolean;
}

// ─── Classification par mots-clés (fallback) ──────────────────────────────

function keywordClassify(
  subject: string,
  description: string
): { category: TicketCategory; urgency: TicketUrgency } {
  const text = `${subject} ${description}`.toLowerCase();

  let category: TicketCategory = "autre";
  if (/bug|erreur|crash|broken|problème technique|ne fonctionne pas/.test(text)) {
    category = "bug";
  } else if (/paie|stripe|carte|abonnement|facture|paiement|checkout/.test(text)) {
    category = "paiement";
  } else if (/compte|mot de passe|email|profil|connexion|login|accès/.test(text)) {
    category = "compte";
  }

  let urgency: TicketUrgency = "basse";
  if (/urgent|critique|bloqué|impossible|ne peut pas|erreur grave/.test(text)) {
    urgency = "haute";
  } else if (/problème|bug|souci|difficulté|ne marche pas/.test(text)) {
    urgency = "moyenne";
  }

  return { category, urgency };
}

// ─── Classification principale ─────────────────────────────────────────────

export async function classifyTicket(
  subject: string,
  description: string
): Promise<ClassifyResult> {
  // Essayer Gemini si la clé est disponible
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `Tu es un assistant de support client. Classifie ce ticket de support en JSON strict.

Sujet: "${subject}"
Description: "${description}"

Réponds UNIQUEMENT avec ce JSON (sans markdown):
{
  "category": "bug" | "paiement" | "compte" | "autre",
  "urgency": "haute" | "moyenne" | "basse"
}

- bug: problème technique, erreur, crash
- paiement: abonnement, Stripe, facturation
- compte: connexion, profil, mot de passe
- autre: tout le reste
- haute: bloque complètement l'utilisateur
- moyenne: impacte l'utilisation
- basse: cosmétique ou question`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 100 },
          }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const cleaned = raw.replace(/```json?|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const validCategories: TicketCategory[] = ["bug", "paiement", "compte", "autre", "non_classe"];
        const validUrgencies: TicketUrgency[] = ["haute", "moyenne", "basse"];

        const category = validCategories.includes(parsed.category)
          ? parsed.category
          : "non_classe";
        const urgency = validUrgencies.includes(parsed.urgency)
          ? parsed.urgency
          : "basse";

        return { category, urgency, usedAi: true };
      }
    } catch {
      // Fallback silencieux
    }
  }

  // Fallback par mots-clés
  const { category, urgency } = keywordClassify(subject, description);
  return { category, urgency, usedAi: false };
}
