import { getStoredToken } from "@/lib/auth-storage";
import { API_URL } from "@/lib/constants";

export type UploadedMedia = {
  url: string;
  type: "image" | "video" | "document";
  name: string;
};

export async function uploadPostMedia(file: File): Promise<UploadedMedia> {
  const token = getStoredToken();
  if (!token) throw new Error("Connectez-vous pour ajouter un média.");

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/v1/me/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const raw = await res.text();
  let json: { success: true; data: UploadedMedia } | { success: false; error?: { message?: string } };
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Réponse invalide du serveur (${res.status}). Réessayez dans un instant.`);
  }

  if (!res.ok || !json.success) {
    throw new Error(!json.success ? json.error?.message || "Échec de l'envoi du média." : "Échec de l'envoi du média.");
  }
  return json.data;
}
