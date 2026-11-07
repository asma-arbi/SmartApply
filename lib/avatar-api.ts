import { api } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";
import { API_URL } from "@/lib/constants";

export type AvatarPayload = {
  kind: "company" | "candidate";
  url: string | null;
  coverUrl?: string | null;
  companyId?: string | null;
  name?: string | null;
};

export async function fetchMyAvatar() {
  return api<AvatarPayload>("/me/avatar");
}

export async function uploadMyAvatar(file: File) {
  const token = getStoredToken();
  if (!token) throw new Error("Connectez-vous pour ajouter une photo.");

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/v1/me/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const raw = await res.text();
  let json: { success: true; data: AvatarPayload } | { success: false; error?: { message?: string } };
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Réponse invalide du serveur (${res.status}). Réessayez dans un instant.`);
  }

  if (!res.ok || !json.success) {
    throw new Error(!json.success ? json.error?.message || "Échec de l'envoi de la photo." : "Échec de l'envoi de la photo.");
  }
  return json.data;
}
