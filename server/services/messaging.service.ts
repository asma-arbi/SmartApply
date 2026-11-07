import { connectDB } from "@/server/lib/mongodb";
import { Conversation, DirectMessage, MessageAttachment, NetworkConnection, NetworkNotification } from "@/server/models/network.model";
import { CandidateProfile, Company } from "@/server/models/catalog.model";
import { User } from "@/server/models/user.model";
import type { AuthUser } from "@/server/middleware/auth";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

type PublicMember = { id: string; name: string; role: string; avatarUrl: string | null; href: string; online: boolean };

function memberOnline(lastSeenAt?: Date | null) {
  return Boolean(lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 90_000);
}

async function publicMember(userId: string): Promise<PublicMember> {
  const user = await User.findById(userId).select("email name role lastSeenAt").lean() as { email: string; name?: string; role: string; lastSeenAt?: Date | null } | null;
  if (!user) throw new NotFoundError("Membre introuvable.");
  if (user.role === "CANDIDATE") {
    const profile = await CandidateProfile.findOne({ email: user.email }).select("fullName avatarUrl").lean() as { fullName?: string; avatarUrl?: string | null } | null;
    return { id: userId, name: profile?.fullName?.trim() || user.name?.trim() || user.email.split("@")[0] || "Candidat", role: user.role, avatarUrl: profile?.avatarUrl ?? null, href: `/candidats/${encodeURIComponent(userId)}`, online: memberOnline(user.lastSeenAt) };
  }
  const company = await Company.findOne({ $or: [{ ownerEmail: user.email }, { recruiterEmail: user.email }] }).select("_id name logoUrl").lean() as { _id: unknown; name: string; logoUrl?: string | null } | null;
  return { id: userId, name: company?.name || user.name?.trim() || "Entreprise", role: user.role, avatarUrl: company?.logoUrl ?? null, href: company ? `/entreprises/${encodeURIComponent(String(company._id))}` : "/company", online: memberOnline(user.lastSeenAt) };
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

async function assertConnected(a: string, b: string) {
  const connection = await NetworkConnection.exists({
    status: "CONNECTED",
    $or: [{ requesterId: a, targetId: b }, { requesterId: b, targetId: a }],
  });
  if (!connection) throw new ValidationError("La messagerie est disponible après l’acceptation de l’invitation.");
}

export async function openConversation(user: AuthUser, otherId: string) {
  await connectDB();
  if (!otherId || otherId === user.id) throw new ValidationError("Destinataire invalide.");
  await assertConnected(user.id, otherId);
  const key = pairKey(user.id, otherId);
  let conversation = await Conversation.findOne({ participantKey: key }).lean() as { _id: unknown } | null;
  if (!conversation) {
    try {
      conversation = await Conversation.create({ participantKey: key, participantIds: [user.id, otherId] }) as unknown as { _id: unknown };
    } catch {
      conversation = await Conversation.findOne({ participantKey: key }).lean() as { _id: unknown } | null;
    }
  }
  if (!conversation) throw new ValidationError("Impossible d’ouvrir cette conversation.");
  return { id: String(conversation._id) };
}

export async function openCompanyConversation(user: AuthUser, companyId: string) {
  await connectDB();
  if (user.role !== "CANDIDATE") throw new ValidationError("Seul un candidat peut contacter une entreprise.");
  const company = await Company.findById(companyId).select("ownerEmail recruiterEmail").lean() as { ownerEmail?: string | null; recruiterEmail?: string | null } | null;
  if (!company) throw new NotFoundError("Entreprise introuvable.");
  const contact = company.ownerEmail || company.recruiterEmail;
  const recipient = contact ? await User.findOne({ email: contact.toLowerCase() }).select("_id").lean() as { _id: unknown } | null : null;
  if (!recipient) throw new ValidationError("Aucun compte de contact SmartApply n’est associé à cette entreprise.");
  return openConversation(user, String(recipient._id));
}

export async function listConversations(user: AuthUser) {
  await connectDB();
  const rows = await Conversation.find({ participantIds: user.id }).sort({ lastMessageAt: -1, updatedAt: -1 }).limit(100).lean() as unknown as Array<{
    _id: unknown; participantIds: string[]; lastMessage: string; lastMessageAt?: Date | null;
  }>;
  const items = await Promise.all(rows.map(async (row) => {
    const otherId = row.participantIds.find((id) => id !== user.id);
    if (!otherId) return null;
    const [member, unread, connected] = await Promise.all([
      publicMember(otherId),
      DirectMessage.countDocuments({ conversationId: String(row._id), senderId: { $ne: user.id }, readAt: null }),
      NetworkConnection.exists({ status: "CONNECTED", $or: [{ requesterId: user.id, targetId: otherId }, { requesterId: otherId, targetId: user.id }] }),
    ]);
    if (!connected) return null;
    return { id: String(row._id), member, lastMessage: row.lastMessage, lastMessageAt: row.lastMessageAt?.toISOString() ?? null, unread };
  }));
  return items.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function listConversationMessages(user: AuthUser, conversationId: string) {
  await connectDB();
  const conversation = await Conversation.findOne({ _id: conversationId, participantIds: user.id }).lean() as { participantIds: string[] } | null;
  if (!conversation) throw new NotFoundError("Conversation introuvable.");
  const otherId = conversation.participantIds.find((id) => id !== user.id);
  if (!otherId) throw new NotFoundError("Conversation introuvable.");
  await assertConnected(user.id, otherId);
  const now = new Date();
  await DirectMessage.updateMany({ conversationId, senderId: { $ne: user.id }, readAt: null }, { $set: { readAt: now } });
  const rows = await DirectMessage.find({ conversationId }).sort({ createdAt: 1 }).limit(500).lean() as unknown as Array<{
    _id: unknown; senderId: string; body: string; createdAt: Date; readAt?: Date | null; editedAt?: Date | null;
    attachments?: Array<{ fileId: string; name: string; type: "image" | "document"; size: number }>;
    reactions?: Array<{ userId: string; emoji: string }>;
  }>;
  return rows.map((row) => ({
    id: String(row._id), senderId: row.senderId,
    body: row.body === "Pièce jointe" && row.attachments?.length ? "" : row.body,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null, editedAt: row.editedAt?.toISOString() ?? null,
    attachments: row.attachments ?? [],
    reactions: summarizeReactions(row.reactions ?? [], user.id),
  }));
}

type MessageFileKind = "image" | "document";
const MESSAGE_REACTIONS = new Set(["👍", "❤️", "😊", "😂", "🎉", "🙏"]);

function summarizeReactions(reactions: Array<{ userId: string; emoji: string }>, userId: string) {
  const grouped = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
  for (const reaction of reactions) {
    const item = grouped.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, reactedByMe: false };
    item.count += 1;
    item.reactedByMe ||= reaction.userId === userId;
    grouped.set(reaction.emoji, item);
  }
  return [...grouped.values()];
}

async function requireConversation(user: AuthUser, conversationId: string) {
  const conversation = await Conversation.findOne({ _id: conversationId, participantIds: user.id }).lean() as { participantIds: string[] } | null;
  if (!conversation) throw new NotFoundError("Conversation introuvable.");
  const otherId = conversation.participantIds.find((id) => id !== user.id);
  if (!otherId) throw new NotFoundError("Conversation introuvable.");
  await assertConnected(user.id, otherId);
  return { conversation, otherId };
}

export async function storeMessageAttachment(user: AuthUser, conversationId: string, file: { name: string; type: string; bytes: Uint8Array }) {
  await connectDB();
  await requireConversation(user, conversationId);
  const kind: MessageFileKind | null = file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif"
    ? "image"
    : file.type === "application/pdf" ? "document" : null;
  if (!kind) throw new ValidationError("Formats autorisés : JPG, PNG, WebP, GIF et PDF.");
  if (!file.bytes.byteLength) throw new ValidationError("Le fichier sélectionné est vide.");
  if (file.bytes.byteLength > 8 * 1024 * 1024) throw new ValidationError("Chaque fichier doit faire au maximum 8 Mo.");
  const record = await MessageAttachment.create({
    conversationId,
    ownerId: user.id,
    name: file.name.trim().slice(0, 180) || "fichier",
    type: kind,
    mimeType: file.type,
    size: file.bytes.byteLength,
    content: Buffer.from(file.bytes),
  });
  return { id: String(record._id), name: record.name as string, type: kind, size: record.size as number };
}

export async function getMessageAttachment(user: AuthUser, attachmentId: string) {
  await connectDB();
  const message = await DirectMessage.findOne({ "attachments.fileId": attachmentId }).select("conversationId").lean() as { conversationId: string } | null;
  if (!message) throw new NotFoundError("Fichier introuvable.");
  await requireConversation(user, message.conversationId);
  const file = await MessageAttachment.findById(attachmentId).select("+content").lean() as unknown as {
    name: string; type: string; mimeType: string; content: Buffer | { buffer: Uint8Array; position?: number };
  } | null;
  if (!file) throw new NotFoundError("Fichier introuvable.");
  const binary: unknown = file.content;
  let content: Buffer;
  if (Buffer.isBuffer(binary)) {
    content = Buffer.from(binary);
  } else {
    const mongoBinary = binary as { buffer?: Uint8Array; position?: number };
    const data = mongoBinary.buffer;
    content = data ? Buffer.from(data.subarray(0, mongoBinary.position ?? data.length)) : Buffer.alloc(0);
  }
  return { ...file, content };
}

export async function sendDirectMessage(user: AuthUser, conversationId: string, body: string, attachmentIds: string[] = []) {
  await connectDB();
  const text = body.trim();
  const uniqueIds = [...new Set(attachmentIds)].slice(0, 5);
  if (text.length > 4000 || (!text && !uniqueIds.length)) throw new ValidationError("Écrivez un message ou ajoutez un fichier (5 fichiers maximum).");
  await requireConversation(user, conversationId);
  const files = uniqueIds.length ? await MessageAttachment.find({ _id: { $in: uniqueIds }, ownerId: user.id, conversationId }).lean() as unknown as Array<{ _id: unknown; name: string; type: MessageFileKind; size: number }> : [];
  if (files.length !== uniqueIds.length) throw new ValidationError("Un fichier est invalide ou ne vous appartient pas.");
  if (files.reduce((total, file) => total + file.size, 0) > 20 * 1024 * 1024) throw new ValidationError("La taille totale des fichiers ne peut pas dépasser 20 Mo.");
  const attachments = files.map((file) => ({ fileId: String(file._id), name: file.name, type: file.type, size: file.size }));
  // Keep a non-empty fallback for database instances that still have the older required body schema.
  const storedBody = text || (attachments.length ? "Pièce jointe" : "");
  const message = await DirectMessage.create({ conversationId, senderId: user.id, body: storedBody, attachments });
  if (uniqueIds.length) await MessageAttachment.updateMany({ _id: { $in: uniqueIds }, ownerId: user.id, conversationId }, { $set: { expiresAt: null } });
  const preview = text || `Fichier : ${attachments[0]?.name ?? "pièce jointe"}`;
  await Conversation.updateOne({ _id: conversationId }, { $set: { lastMessage: preview.slice(0, 180), lastSenderId: user.id, lastMessageAt: new Date() } });
  return {
    id: String(message._id), senderId: user.id, body: text, createdAt: message.createdAt.toISOString(), readAt: null,
    editedAt: null, attachments, reactions: [],
  };
}

export async function editDirectMessage(user: AuthUser, conversationId: string, messageId: string, body: string) {
  await connectDB();
  const text = body.trim();
  if (text.length > 4000) throw new ValidationError("Un message ne peut pas dépasser 4 000 caractères.");
  await requireConversation(user, conversationId);
  const message = await DirectMessage.findOne({ _id: messageId, conversationId, senderId: user.id });
  if (!message) throw new NotFoundError("Vous ne pouvez modifier que vos propres messages.");
  if (!text && !message.attachments?.length) throw new ValidationError("Un message doit contenir du texte ou une pièce jointe.");
  const previousBody = message.body;
  message.body = text || (message.attachments?.length ? "Pièce jointe" : "");
  message.editedAt = new Date();
  await message.save();
  const conversation = await Conversation.findById(conversationId).select("lastMessage lastSenderId").lean() as { lastMessage?: string; lastSenderId?: string } | null;
  const previousPreview = previousBody && previousBody !== "Pièce jointe" ? previousBody : `Fichier : ${message.attachments?.[0]?.name ?? "pièce jointe"}`;
  if (conversation?.lastSenderId === user.id && conversation.lastMessage === previousPreview) {
    await Conversation.updateOne({ _id: conversationId }, { $set: { lastMessage: (text || `Fichier : ${message.attachments?.[0]?.name ?? "pièce jointe"}`).slice(0, 180) } });
  }
  return { success: true };
}

export async function deleteDirectMessage(user: AuthUser, conversationId: string, messageId: string) {
  await connectDB();
  await requireConversation(user, conversationId);
  const message = await DirectMessage.findOne({ _id: messageId, conversationId, senderId: user.id }).lean() as unknown as { _id: unknown; attachments?: Array<{ fileId: string }> } | null;
  if (!message) throw new NotFoundError("Vous ne pouvez supprimer que vos propres messages.");
  await DirectMessage.deleteOne({ _id: messageId, senderId: user.id });
  const fileIds = message.attachments?.map((file) => file.fileId) ?? [];
  if (fileIds.length) await MessageAttachment.deleteMany({ _id: { $in: fileIds }, ownerId: user.id });
  const latest = await DirectMessage.findOne({ conversationId }).sort({ createdAt: -1 }).lean() as unknown as { senderId: string; body: string; attachments?: Array<{ name: string }> ; createdAt: Date } | null;
  await Conversation.updateOne({ _id: conversationId }, { $set: {
    lastMessage: latest ? (latest.body || `Fichier : ${latest.attachments?.[0]?.name ?? "pièce jointe"}`).slice(0, 180) : "",
    lastSenderId: latest?.senderId ?? null,
    lastMessageAt: latest?.createdAt ?? null,
  } });
  return { success: true };
}

export async function toggleMessageReaction(user: AuthUser, conversationId: string, messageId: string, emoji: string) {
  await connectDB();
  if (!MESSAGE_REACTIONS.has(emoji)) throw new ValidationError("Réaction non prise en charge.");
  await requireConversation(user, conversationId);
  const message = await DirectMessage.findOne({ _id: messageId, conversationId });
  if (!message) throw new NotFoundError("Message introuvable.");
  const reactions = (message.reactions ?? []) as Array<{ userId: string; emoji: string }>;
  const index = reactions.findIndex((reaction) => reaction.userId === user.id);
  if (index >= 0 && reactions[index].emoji === emoji) reactions.splice(index, 1);
  else if (index >= 0) reactions[index] = { userId: user.id, emoji };
  else reactions.push({ userId: user.id, emoji });
  message.reactions = reactions as typeof message.reactions;
  await message.save();
  return { reactions: summarizeReactions(reactions, user.id) };
}

export async function listNetworkNotifications(user: AuthUser) {
  await connectDB();
  const rows = await NetworkNotification.find({ recipientId: user.id }).sort({ createdAt: -1 }).limit(100).lean() as unknown as Array<{
    _id: unknown; actorId: string; type: string; readAt?: Date | null; createdAt: Date;
  }>;
  const items = await Promise.all(rows.map(async (row) => ({
    id: String(row._id), type: row.type, read: Boolean(row.readAt), createdAt: row.createdAt.toISOString(), actor: await publicMember(row.actorId),
  })));
  const incomingRequests = await NetworkConnection.countDocuments({ targetId: user.id, status: "PENDING" });
  return { items, unread: items.filter((item) => !item.read).length, incomingRequests };
}

export async function markNotificationsRead(user: AuthUser) {
  await connectDB();
  await NetworkNotification.updateMany({ recipientId: user.id, readAt: null }, { $set: { readAt: new Date() } });
  return { success: true };
}
