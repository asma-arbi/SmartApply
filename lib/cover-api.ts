import { getStoredToken } from "@/lib/auth-storage";
import { API_URL } from "@/lib/constants";

export async function fetchMyCover(): Promise<string | null> {
  const token = getStoredToken();
  if (!token) return null;
  const response = await fetch(`${API_URL}/api/v1/me/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const raw = await response.text();
  let result: { success: true; data: { coverUrl?: string | null } } | { success: false };
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error(`Réponse invalide du serveur (${response.status}).`);
  }
  if (!response.ok || !result.success) throw new Error("Impossible de charger la couverture enregistrée.");
  return result.data.coverUrl ?? null;
}

export async function uploadMyCover(file: File): Promise<string> {
  const token = getStoredToken();
  if (!token) throw new Error("Connectez-vous pour ajouter une photo de couverture.");
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/api/v1/me/cover`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const raw = await response.text();
  let result: { success: true; data: { url: string } } | { success: false; error?: { message?: string } };
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error(`Réponse invalide du serveur (${response.status}).`);
  }
  if (!response.ok || !result.success) {
    throw new Error(!result.success ? result.error?.message || "Échec de l’envoi de la couverture." : "Échec de l’envoi de la couverture.");
  }
  if (!result.data.url) throw new Error("Le serveur n’a pas confirmé l’enregistrement de la couverture.");
  const persisted = await fetchMyCover();
  if (persisted !== result.data.url) throw new Error("La couverture n’a pas été conservée dans votre profil. Réessayez.");
  return persisted;
}
