/**
 * lib/support/types.ts
 * 
 * Types TypeScript pour le module Support & Tickets.
 */

export type TicketStatus = "ouvert" | "en_cours" | "resolu" | "clos";

export type TicketCategory =
  | "bug"
  | "paiement"
  | "compte"
  | "autre"
  | "non_classe";

export type TicketUrgency = "haute" | "moyenne" | "basse";

export type TicketAuthorRole = "candidat" | "entreprise" | "admin";

export interface TicketReply {
  authorId: string;
  authorRole: TicketAuthorRole;
  body: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userRole: "candidat" | "entreprise";
  subject: string;
  description: string;
  category: TicketCategory;
  urgency: TicketUrgency | null;
  aiClassified: boolean;
  status: TicketStatus;
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export type CreateTicketInput = Omit<Ticket, "id">;
