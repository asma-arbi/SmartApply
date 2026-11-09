/**
 * Vérification côté serveur Google reCAPTCHA v3
 */
export async function verifyRecaptchaToken(
  token: string | null | undefined,
  expectedAction?: string
): Promise<{ success: boolean; score?: number; error?: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const threshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || "0.5");

  // Mode développement tolérant si la clé secrète n'est pas encore configurée
  if (!secretKey || secretKey.startsWith("your_") || secretKey === "dummy_key") {
    if (process.env.NODE_ENV === "production") return {success:false,error:"Le service de sécurité n’est pas configuré."};
    console.warn(
      "[reCAPTCHA] RECAPTCHA_SECRET_KEY non configurée. Validation automatique en mode développement."
    );
    return { success: true, score: 1.0 };
  }

  if (!token || token.trim() === "") {
    return {
      success: false,
      error: "Token de sécurité reCAPTCHA manquant. Veuillez rafraîchir la page.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      cache: "no-store",
    });

    const data = await res.json();

    if (!data.success) {
      console.warn("[reCAPTCHA] Échec de vérification Google :", data["error-codes"]);
      return {
        success: false,
        error: "Vérification de sécurité reCAPTCHA échouée. Veuillez réessayer.",
      };
    }

    const score = typeof data.score === "number" ? data.score : 1.0;

    // Vérification du score par rapport au seuil configuré (ex: 0.5)
    if (score < threshold) {
      console.warn(`[reCAPTCHA] Score insuffisant: ${score} < seuil ${threshold}`);
      return {
        success: false,
        score,
        error: "Comportement automatisé suspect détecté. Requête rejetée.",
      };
    }

    // Vérification de l'action si fournie
    if (expectedAction && ((process.env.NODE_ENV === "production" && data.action !== expectedAction) || (data.action && data.action !== expectedAction))) {
      if (process.env.NODE_ENV === "production") return {success:false,error:"Action reCAPTCHA invalide."};
      console.warn(`[reCAPTCHA] Action mismatch: ${data.action} != ${expectedAction}`);
    }

    return { success: true, score };
  } catch (err) {
    console.error("[reCAPTCHA] Erreur réseau lors de la vérification :", (err as Error).message);
    // En cas de panne de Google, ne pas bloquer complètement les utilisateurs si souhaité
    return { success: false, error: "Impossible de vérifier le service de sécurité reCAPTCHA." };
  }
}
