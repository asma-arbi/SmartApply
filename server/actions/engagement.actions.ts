"use server";

import { verifyServerUser, getOptionalServerUser } from "@/server/lib/auth-server";
import {
  toggleLike,
  toggleBookmark,
  listBookmarks,
  listComments,
  createComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  hidePost,
  unhidePost,
  reportPost,
} from "@/server/services/engagement.service";
import { revalidatePath } from "next/cache";
import { reportCompany } from "@/server/services/company-moderation.service";
import type { ReactionType, ReportReason } from "@/server/models/engagement.model";

export async function toggleLikeAction(postId: string, type: ReactionType = "LIKE") {
  const user = await verifyServerUser();
  return toggleLike(user, postId, type);
}

export async function toggleBookmarkAction(postId: string) {
  const user = await verifyServerUser();
  return toggleBookmark(user, postId);
}

export async function listBookmarksAction(page = 1, limit = 20) {
  const user = await verifyServerUser();
  return listBookmarks(user, page, limit);
}

export async function listCommentsAction(postId: string, page = 1, limit = 20) {
  const user = await getOptionalServerUser();
  return listComments(postId, page, limit, user?.id);
}

export async function createCommentAction(postId: string, body: string, parentId?: string) {
  const user = await verifyServerUser();
  const comment = await createComment(user, postId, body, parentId);
  revalidatePath(`/posts/${postId}`);
  return { success: true as const, data: comment };
}

export async function updateCommentAction(commentId: string, body: string) {
  const user = await verifyServerUser();
  return updateComment(user, commentId, body);
}

export async function deleteCommentAction(commentId: string) {
  const user = await verifyServerUser();
  return deleteComment(user, commentId);
}

export async function toggleCommentLikeAction(commentId: string, type: ReactionType = "LIKE") {
  const user = await verifyServerUser();
  return toggleCommentLike(user, commentId, type);
}

export async function hidePostAction(postId: string) {
  const user = await verifyServerUser();
  return hidePost(user, postId);
}

export async function unhidePostAction(postId: string) {
  const user = await verifyServerUser();
  return unhidePost(user, postId);
}

export async function reportPostAction(postId: string, reason: ReportReason, details?: string) {
  const user = await verifyServerUser();
  return reportPost(user, postId, reason, details);
}

export async function reportCompanyAction(companyId: string, reason: ReportReason, details?: string) {
  const user = await verifyServerUser();
  return reportCompany(user, companyId, reason, details);
}
