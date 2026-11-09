/**
 * lib/support/db.ts
 *
 * Couche d'accès MongoDB pour le module Support (tickets).
 * Toutes les requêtes sont scopées par userId pour l'ownership.
 */

import { getDb } from "@/lib/mongodb";
import { randomUUID } from "crypto";
import type { Ticket, CreateTicketInput, TicketReply } from "./types";

const COLLECTION = "support_tickets";

// ─── Initialisation des index ──────────────────────────────────────────────

export async function initSupportIndexes(): Promise<void> {
  try {
    const db = await getDb();
    const col = db.collection(COLLECTION);
    await Promise.all([
      col.createIndex({ userId: 1, createdAt: -1 }),
      col.createIndex({ status: 1 }),
      col.createIndex({ createdAt: -1 }),
      col.createIndex({ id: 1 }, { unique: true }),
    ]);
  } catch {
    // Idempotent — ignorer si les index existent déjà
  }
}

// ─── Création d'un ticket ──────────────────────────────────────────────────

export async function createTicket(input: CreateTicketInput): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.collection(COLLECTION).insertOne({ ...input, id });
  return id;
}

// ─── Lister les tickets d'un utilisateur ──────────────────────────────────

export async function getUserTickets(userId: string): Promise<Ticket[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(serializeTicket);
}

// ─── Récupérer un ticket (avec ownership) ─────────────────────────────────

export async function getUserTicketById(
  ticketId: string,
  userId: string
): Promise<Ticket | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ id: ticketId, userId });
  if (!doc) return null;
  return serializeTicket(doc);
}

// ─── Récupérer un ticket (admin — sans ownership) ─────────────────────────

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ id: ticketId });
  if (!doc) return null;
  return serializeTicket(doc);
}

// ─── Lister tous les tickets (admin) ──────────────────────────────────────

export async function getAllTickets(filters?: {
  status?: string;
  category?: string;
}): Promise<Ticket[]> {
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (filters?.status && filters.status !== "all") query.status = filters.status;
  if (filters?.category && filters.category !== "all") query.category = filters.category;

  const docs = await db
    .collection(COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(serializeTicket);
}

// ─── Ajouter une réponse ───────────────────────────────────────────────────

export async function addReplyToTicket(
  ticketId: string,
  reply: TicketReply,
  userId?: string // si undefined → admin
): Promise<boolean> {
  const db = await getDb();
  const query = userId ? { id: ticketId, userId } : { id: ticketId };
  const now = new Date().toISOString();

  const result = await db.collection(COLLECTION).updateOne(query, {
    $push: { replies: reply } as any,
    $set: { updatedAt: now, status: "en_cours" },
  });

  return result.modifiedCount > 0;
}

// ─── Réouvrir un ticket (utilisateur) ─────────────────────────────────────

export async function reopenTicket(
  ticketId: string,
  userId: string
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection(COLLECTION).updateOne(
    { id: ticketId, userId, status: "resolu" },
    { $set: { status: "ouvert", updatedAt: new Date().toISOString() } }
  );
  return result.modifiedCount > 0;
}

// ─── Changer le statut d'un ticket (admin) ────────────────────────────────

export async function updateTicketStatus(
  ticketId: string,
  status: string
): Promise<boolean> {
  const db = await getDb();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status,
    updatedAt: now,
  };
  if (status === "clos" || status === "resolu") {
    update.closedAt = now;
  }

  const result = await db
    .collection(COLLECTION)
    .updateOne({ id: ticketId }, { $set: update });

  return result.modifiedCount > 0;
}

// ─── Répondre à un ticket (admin) ─────────────────────────────────────────

export async function adminReplyToTicket(
  ticketId: string,
  reply: TicketReply,
  newStatus?: string
): Promise<boolean> {
  const db = await getDb();
  const now = new Date().toISOString();
  const setFields: Record<string, unknown> = { updatedAt: now };
  if (newStatus) {
    setFields.status = newStatus;
    if (newStatus === "resolu" || newStatus === "clos") {
      setFields.closedAt = now;
    }
  }

  const result = await db.collection(COLLECTION).updateOne(
    { id: ticketId },
    {
      $push: { replies: reply } as any,
      $set: setFields,
    }
  );
  return result.modifiedCount > 0;
}

// ─── Compter les tickets récents (anti-spam) ──────────────────────────────

export async function countRecentTickets(userId: string): Promise<number> {
  const db = await getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return db.collection(COLLECTION).countDocuments({
    userId,
    createdAt: { $gte: oneHourAgo },
  });
}

// ─── Compter les tickets en attente (admin) ───────────────────────────────

export async function countPendingTickets(): Promise<number> {
  const db = await getDb();
  return db
    .collection(COLLECTION)
    .countDocuments({ status: { $in: ["ouvert", "en_cours"] } });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function serializeTicket(doc: Record<string, unknown>): Ticket {
  const { _id, ...rest } = doc as any;
  return rest as Ticket;
}
