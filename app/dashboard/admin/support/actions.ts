"use server";

/**
 * app/dashboard/admin/support/actions.ts
 *
 * Server Actions d'administration des tickets support.
 * Réservées EXCLUSIVEMENT à l'admin.
 * L'approbation (résoudre/clore) est effectuée côté admin.
 */

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import {
  getAllTickets,
  getTicketById,
  adminReplyToTicket,
  updateTicketStatus,
  countPendingTickets,
} from "@/lib/support/db";
import type { TicketReply } from "@/lib/support/types";

// ─── Helper sécurité ──────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session) return null;
  if (session.user.role !== "admin") return null;
  return session.user;
}

// ─── A1 : Lister tous les tickets ─────────────────────────────────────────

export async function adminGetAllTickets(filters?: {
  status?: string;
  category?: string;
}) {
  const admin = await requireAdmin();
  if (!admin) return [];
  return getAllTickets(filters);
}

// ─── A2 : Répondre à un ticket + changer le statut ────────────────────────

export type AdminReplyResult = { ok: true } | { ok: false; error: string };

export async function adminActionReply(
  ticketId: string,
  fd: FormData
): Promise<AdminReplyResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: "Accès refusé." };

    const body = typeof fd.get("body") === "string" ? (fd.get("body") as string).trim() : "";
    const newStatus = typeof fd.get("status") === "string" ? (fd.get("status") as string) : undefined;

    if (body.length < 1 || body.length > 2000) {
      return { ok: false, error: "Le message doit contenir entre 1 et 2000 caractères." };
    }

    const ticket = await getTicketById(ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };

    const reply: TicketReply = {
      authorId: admin.id,
      authorRole: "admin",
      body,
      createdAt: new Date().toISOString(),
    };

    const success = await adminReplyToTicket(ticketId, reply, newStatus);
    if (!success) return { ok: false, error: "Impossible d'envoyer la réponse." };

    revalidatePath(`/dashboard/admin/support/${ticketId}`);
    revalidatePath("/dashboard/admin/support");
    return { ok: true };
  } catch (err) {
    console.error("[adminActionReply] Erreur :", (err as Error).message);
    return { ok: false, error: "Erreur interne. Réessayez." };
  }
}

// ─── A3 : Changer le statut d'un ticket (approuver / clore / résoudre) ────

export async function adminActionChangeStatus(
  ticketId: string,
  status: string
): Promise<AdminReplyResult> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: "Accès refusé." };

    const validStatuses = ["ouvert", "en_cours", "resolu", "clos"];
    if (!validStatuses.includes(status)) {
      return { ok: false, error: "Statut invalide." };
    }

    const ticket = await getTicketById(ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };

    const success = await updateTicketStatus(ticketId, status);
    if (!success) return { ok: false, error: "Impossible de changer le statut." };

    revalidatePath(`/dashboard/admin/support/${ticketId}`);
    revalidatePath("/dashboard/admin/support");
    return { ok: true };
  } catch (err) {
    console.error("[adminActionChangeStatus] Erreur :", (err as Error).message);
    return { ok: false, error: "Erreur interne. Réessayez." };
  }
}

// ─── A4 : Compter les tickets en attente ──────────────────────────────────

export async function adminGetPendingCount(): Promise<number> {
  const admin = await requireAdmin();
  if (!admin) return 0;
  return countPendingTickets();
}
