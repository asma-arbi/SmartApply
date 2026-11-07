import { API_URL } from "@/lib/constants";
import { getStoredToken } from "@/lib/auth-storage";

export type StoredMessageAttachment = { id: string; name: string; type: "image" | "document"; size: number };

export async function fetchPrivateMessageAttachment(attachmentId: string) {
  const token = getStoredToken();
  if (!token) throw new Error("Session expirée.");
  const response = await fetch(`${API_URL}/api/v1/messages/attachments/${encodeURIComponent(attachmentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Fichier inaccessible.");
  return response.blob();
}
