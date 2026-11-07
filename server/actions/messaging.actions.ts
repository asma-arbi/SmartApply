"use server";

import { verifyServerUser } from "@/server/lib/auth-server";
import { deleteDirectMessage, editDirectMessage, listConversationMessages, listConversations, openConversation, openCompanyConversation, sendDirectMessage, listNetworkNotifications, markNotificationsRead, storeMessageAttachment, toggleMessageReaction } from "@/server/services/messaging.service";

export async function openConversationAction(otherId: string) {
  return openConversation(await verifyServerUser(), otherId);
}

export async function openCompanyConversationAction(companyId: string) {
  return openCompanyConversation(await verifyServerUser(), companyId);
}

export async function listConversationsAction() {
  return listConversations(await verifyServerUser());
}

export async function listConversationMessagesAction(conversationId: string) {
  return listConversationMessages(await verifyServerUser(), conversationId);
}

export async function sendDirectMessageAction(conversationId: string, body: string, attachmentIds: string[] = []) {
  return sendDirectMessage(await verifyServerUser(), conversationId, body, attachmentIds);
}

export async function uploadMessageAttachmentAction(formData: FormData) {
  const conversationId = formData.get("conversationId");
  const file = formData.get("file");
  if (typeof conversationId !== "string" || !conversationId || !(file instanceof File)) {
    throw new Error("Conversation et fichier requis.");
  }
  return storeMessageAttachment(await verifyServerUser(), conversationId, {
    name: file.name,
    type: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
}

export async function editDirectMessageAction(conversationId: string, messageId: string, body: string) {
  return editDirectMessage(await verifyServerUser(), conversationId, messageId, body);
}

export async function deleteDirectMessageAction(conversationId: string, messageId: string) {
  return deleteDirectMessage(await verifyServerUser(), conversationId, messageId);
}

export async function toggleMessageReactionAction(conversationId: string, messageId: string, emoji: string) {
  return toggleMessageReaction(await verifyServerUser(), conversationId, messageId, emoji);
}

export async function listNetworkNotificationsAction() {
  return listNetworkNotifications(await verifyServerUser());
}

export async function markNotificationsReadAction() {
  return markNotificationsRead(await verifyServerUser());
}
