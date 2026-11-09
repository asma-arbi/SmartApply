"use server";

/**
 * app/dashboard/support/actions.ts
 *
 * Server Actions du module Support — côté utilisateur (candidat / entreprise).
 * Chaque action vérifie : session → rôle → ownership → input.
 * Aucun userId ni rôle n'est accepté depuis le client.
 */

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import {
  createTicket,
  getUserTickets,
  getUserTicketById,
  addReplyToTicket,
  reopenTicket,
  countRecentTickets,
} from "@/lib/support/db";
import { classifyTicket } from "@/lib/support/ai";
import type { TicketReply } from "@/lib/support/types";

// ─── Helpers de validation ─────────────────────────────────────────────────

function sanitizeString(val: FormDataEntryValue | null): string {
  return typeof val === "string" ? val.trim() : "";
}

// ─── A1 : Créer un ticket ──────────────────────────────────────────────────

export type CreateTicketResult =
  | { ok: true; ticketId: string }
  | { ok: false; error: string };

export async function actionCreateTicket(
  fd: FormData
): Promise<CreateTicketResult> {
  try {
    // 1. Auth
    const session = await getSessionUser();
    if (!session) return { ok: false, error: "Non authentifié." };

    const { user } = session;

    // 2. Rôle — seuls candidat et entreprise créent des tickets
    if (user.role === "admin") {
      return { ok: false, error: "Les administrateurs ne créent pas de tickets." };
    }

    // 3. Validation des entrées
    const subject = sanitizeString(fd.get("subject"));
    const description = sanitizeString(fd.get("description"));

    if (subject.length < 3 || subject.length > 120) {
      return { ok: false, error: "Le sujet doit contenir entre 3 et 120 caractères." };
    }
    if (description.length < 10 || description.length > 2000) {
      return { ok: false, error: "La description doit contenir entre 10 et 2000 caractères." };
    }

    // 4. Limite anti-spam : 5 tickets / heure
    const recentCount = await countRecentTickets(user.id);
    if (recentCount >= 5) {
      return {
        ok: false,
        error: "Limite atteinte : vous ne pouvez créer que 5 tickets par heure. Réessayez plus tard.",
      };
    }

    // 5. Classification IA (avec plan B intégré — ne lève jamais d'exception)
    const now = new Date().toISOString();
    const { category, urgency, usedAi } = await classifyTicket(subject, description);

    // 6. Insertion en base
    const ticketId = await createTicket({
      userId: user.id,
      userRole: user.role as "candidat" | "entreprise",
      subject,
      description,
      category,
      urgency,
      aiClassified: usedAi,
      status: "ouvert",
      replies: [],
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    });

    revalidatePath("/dashboard/support");
    return { ok: true, ticketId };
  } catch (err) {
    console.error("[actionCreateTicket] Erreur :", (err as Error).message);
    return { ok: false, error: "Impossible de créer le ticket. Vérifiez votre connexion et réessayez." };
  }
}

// ─── A2 : Lister mes tickets ───────────────────────────────────────────────

export async function actionGetMyTickets() {
  const session = await getSessionUser();
  if (!session) return [];
  return getUserTickets(session.user.id);
}

// ─── A3 : Ajouter une réponse ─────────────────────────────────────────────

export type ReplyResult = { ok: true } | { ok: false; error: string };

export async function actionAddReply(
  ticketId: string,
  fd: FormData
): Promise<ReplyResult> {
  try {
    const session = await getSessionUser();
    if (!session) return { ok: false, error: "Non authentifié." };

    const { user } = session;
    if (user.role === "admin") return { ok: false, error: "Utilisez le panneau admin." };

    const body = sanitizeString(fd.get("body"));
    if (body.length < 1 || body.length > 2000) {
      return { ok: false, error: "Le message doit contenir entre 1 et 2000 caractères." };
    }

    // Vérification d'ownership
    const ticket = await getUserTicketById(ticketId, user.id);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    if (ticket.status === "clos") {
      return { ok: false, error: "Ce ticket est clos. Vous ne pouvez plus y répondre." };
    }

    const reply: TicketReply = {
      authorId: user.id,
      authorRole: user.role as "candidat" | "entreprise",
      body,
      createdAt: new Date().toISOString(),
    };

    const success = await addReplyToTicket(ticketId, reply, user.id);
    if (!success) return { ok: false, error: "Impossible d'ajouter le message." };

    revalidatePath(`/dashboard/support/${ticketId}`);
    revalidatePath("/dashboard/support");
    return { ok: true };
  } catch (err) {
    console.error("[actionAddReply] Erreur :", (err as Error).message);
    return { ok: false, error: "Impossible d'envoyer le message. Réessayez." };
  }
}

// ─── A4 : Réouvrir un ticket ──────────────────────────────────────────────

export async function actionReopenTicket(ticketId: string): Promise<ReplyResult> {
  try {
    const session = await getSessionUser();
    if (!session) return { ok: false, error: "Non authentifié." };
    if (session.user.role === "admin") return { ok: false, error: "Utilisez le panneau admin." };

    const success = await reopenTicket(ticketId, session.user.id);
    if (!success) return { ok: false, error: "Impossible de réouvrir ce ticket." };

    revalidatePath(`/dashboard/support/${ticketId}`);
    revalidatePath("/dashboard/support");
    return { ok: true };
  } catch (err) {
    console.error("[actionReopenTicket] Erreur :", (err as Error).message);
    return { ok: false, error: "Impossible de réouvrir le ticket. Réessayez." };
  }
}
