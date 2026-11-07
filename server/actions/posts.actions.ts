"use server";

import { verifyServerUser, getOptionalServerUser } from "@/server/lib/auth-server";
import {
  createPost,
  updatePost,
  deletePost,
  publishPost,
  archivePost,
  getPostById,
  searchPublishedPosts,
  listCompanyPosts,
  pinPost,
  repostPost,
  votePoll,
} from "@/server/services/posts.service";
import { CreatePostSchema, UpdatePostSchema, SearchPostsQuerySchema, CompanyPostsQuerySchema, PostStatusSchema } from "@/server/schemas/posts.schema";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/lib/auth-server";
import { moderatePost } from "@/server/services/moderation.service";
import type { ModerationAction } from "@/server/models/engagement.model";

export async function createPostAction(input: unknown) {
  const user = await verifyServerUser();
  const parsed = CreatePostSchema.parse(input);
  const post = await createPost(user, parsed);
  revalidatePath("/");
  revalidatePath("/company");
  return { success: true as const, data: post };
}

export async function updatePostAction(postId: string, input: unknown, status?: unknown) {
  const user = await verifyServerUser();
  const parsed = UpdatePostSchema.parse(input);
  let post = await updatePost(user, postId, parsed);
  if (status !== undefined) {
    const nextStatus = PostStatusSchema.parse(status);
    if (nextStatus === "PUBLISHED") post = await publishPost(user, postId);
    else if (nextStatus === "ARCHIVED") post = await archivePost(user, postId);
  }
  revalidatePath("/");
  revalidatePath("/company");
  return { success: true as const, data: post };
}

export async function setPostStatusAction(postId: string, status: unknown) {
  const user = await verifyServerUser();
  const nextStatus = PostStatusSchema.parse(status);
  let post;
  if (nextStatus === "PUBLISHED") post = await publishPost(user, postId);
  else if (nextStatus === "ARCHIVED") post = await archivePost(user, postId);
  else throw new Error("Transition de statut non prise en charge.");
  revalidatePath("/");
  revalidatePath("/company");
  return { success: true as const, data: post };
}

export async function deletePostAction(postId: string) {
  const user = await verifyServerUser();
  const result = await deletePost(user, postId);
  revalidatePath("/");
  revalidatePath("/company");
  return { success: true as const, data: result };
}

export async function publishPostAction(postId: string) {
  const user = await verifyServerUser();
  const post = await publishPost(user, postId);
  revalidatePath("/");
  revalidatePath("/company");
  return { success: true as const, data: post };
}

export async function archivePostAction(postId: string) {
  const user = await verifyServerUser();
  const post = await archivePost(user, postId);
  revalidatePath("/");
  return { success: true as const, data: post };
}

export async function getPostAction(postId: string) {
  const user = await getOptionalServerUser();
  const post = await getPostById(postId, user);
  return { success: true as const, data: post };
}

export async function searchPostsAction(query: unknown) {
  const user = await getOptionalServerUser();
  const parsed = SearchPostsQuerySchema.parse(query);
  const result = await searchPublishedPosts(parsed, user?.id);
  return { success: true as const, data: result };
}

export async function listCompanyPostsAction(query: unknown) {
  const user = await verifyServerUser();
  const parsed = CompanyPostsQuerySchema.parse(query);
  const result = await listCompanyPosts(user, parsed);
  return { success: true as const, data: result };
}

export async function pinPostAction(postId: string, pinned = true) {
  const user = await verifyServerUser();
  const post = await pinPost(user, postId, pinned);
  return { success: true as const, data: post };
}

export async function repostPostAction(postId: string, commentary?: string) {
  const user = await verifyServerUser();
  const post = await repostPost(user, postId, commentary);
  revalidatePath("/feed");
  return { success: true as const, data: post };
}

export async function votePollAction(postId: string, optionIndex: number) {
  const user = await verifyServerUser();
  const result = await votePoll(user, postId, optionIndex);
  return { success: true as const, data: result };
}

export async function moderatePostAction(postId: string, action: ModerationAction, reason: string) {
  const admin = await requireRole(["ADMIN"]);
  const post = await moderatePost(admin, postId, action, reason);
  revalidatePath("/");
  revalidatePath("/admin/reports");
  return { success: true as const, data: post };
}
