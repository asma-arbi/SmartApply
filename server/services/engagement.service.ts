import type { ReactionType, ReportReason } from "@/server/models/engagement.model";
import { connectDB, withDb } from "@/server/lib/mongodb";
import {
  PostLike,
  PostBookmark,
  PostComment,
  CommentLike,
  PostHide,
  PostReport,
} from "@/server/models/engagement.model";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/lib/errors";
import type { AuthUser } from "@/server/middleware/auth";
import { decorateAuthors, getPublicUsers, nameFromEmail, publicAuthor } from "@/server/lib/users";
import { emptyReactions, getPostCounts, requirePublishedPost } from "@/server/services/posts.service";
import { assertNoExistingReport } from "@/server/services/posts.rules";

export type { ReactionType, ReportReason };

async function reactionSnapshot(postId: string) {
  const rows = await PostLike.aggregate([
    { $match: { postId } },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);
  const reactions = emptyReactions();
  for (const row of rows) reactions[row._id] = row.count;
  const likes = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  return { likes, reactions };
}

export async function toggleLike(user: AuthUser, postId: string, type: ReactionType = "LIKE") {
  await requirePublishedPost(postId);
  await connectDB();
  const existing = await PostLike.findOne({ postId, userId: user.id }).lean() as any;
  if (existing && existing.type === type) {
    await PostLike.deleteOne({ postId, userId: user.id });
    const snapshot = await reactionSnapshot(postId);
    return { liked: false, reaction: null, ...snapshot };
  }
  if (existing) {
    await PostLike.updateOne({ postId, userId: user.id }, { $set: { type } });
  } else {
    await PostLike.create({ postId, userId: user.id, type });
  }
  const snapshot = await reactionSnapshot(postId);
  return { liked: true, reaction: type, ...snapshot };
}

export async function toggleBookmark(user: AuthUser, postId: string) {
  await requirePublishedPost(postId);
  await connectDB();
  const existing = await PostBookmark.findOne({ postId, userId: user.id }).lean();
  if (existing) {
    await PostBookmark.deleteOne({ postId, userId: user.id });
    const bookmarks = await PostBookmark.countDocuments({ postId });
    return { bookmarked: false, bookmarks };
  }
  await PostBookmark.create({ postId, userId: user.id });
  const bookmarks = await PostBookmark.countDocuments({ postId });
  return { bookmarked: true, bookmarks };
}

export async function listBookmarks(user: AuthUser, page: number, limit: number) {
  await connectDB();
  const skip = (page - 1) * limit;
  const rows = await PostBookmark.find({ userId: user.id }).sort({ createdAt: -1 }).lean() as any[];

  const { Post } = await import("@/server/models/post.model");
  const postIds = rows.map((r) => r.postId);
  const posts = await Post.find({ _id: { $in: postIds } }).lean() as any[];
  const postMap = new Map(posts.map((p) => [String(p._id), p]));

  const live = rows
    .map((row) => ({ ...row, post: postMap.get(row.postId) }))
    .filter((row) => row.post && row.post.status === "PUBLISHED" && !row.post.deletedAt);
  const pageRows = live.slice(skip, skip + limit);

  const { catalogForPosts, catalogSlice, toPostDto } = await import("@/server/services/posts.service");
  const catalog = await catalogForPosts(pageRows.map((row) => row.post));
  const counts = await getPostCounts(pageRows.map((row) => String(row.post._id)));
  const postsForDto = pageRows.map((row) => {
    const count = counts.get(String(row.post._id));
    return { ...row.post, _count: { likes: count?.likes ?? 0, comments: count?.comments ?? 0, bookmarks: count?.bookmarks ?? 0 } };
  });
  const dtos = await decorateAuthors(
    postsForDto.map((p, idx) =>
      toPostDto(p, { liked: false, bookmarked: true }, undefined, catalogSlice(pageRows[idx].post, catalog)),
    ),
  );
  return {
    items: pageRows.map((row, index) => ({
      bookmarkedAt: row.createdAt.toISOString(),
      post: dtos[index],
    })),
    page,
    limit,
    total: live.length,
    totalPages: Math.max(1, Math.ceil(live.length / limit)),
  };
}

type CommentLikeRow = { userId: string; type: ReactionType };

function toCommentDto(comment: {
  _id: unknown;
  postId: string;
  userId: string;
  parentId: string | null;
  body: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(comment._id),
    postId: comment.postId,
    parentId: comment.parentId,
    body: comment.deletedAt ? null : comment.body,
    deleted: comment.deletedAt != null,
    author: { id: comment.userId, email: null as string | null, name: "" },
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

function commentReactionPayload(likes: CommentLikeRow[], userId?: string | null) {
  const reactions = emptyReactions();
  for (const like of likes) reactions[like.type] += 1;
  const mine = userId ? likes.find((like) => like.userId === userId) : undefined;
  return {
    likes: likes.length,
    reactions,
    viewer: { liked: Boolean(mine), reaction: mine?.type ?? null },
  };
}

function withCommentReactions(
  comment: {
    _id: unknown;
    postId: string;
    userId: string;
    parentId: string | null;
    body: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    commentLikes?: CommentLikeRow[];
  },
  userId?: string | null,
) {
  return {
    ...toCommentDto(comment),
    ...commentReactionPayload(comment.commentLikes ?? [], userId),
  };
}

async function commentReactionSnapshot(commentId: string) {
  const rows = await CommentLike.aggregate([
    { $match: { commentId } },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);
  const reactions = emptyReactions();
  for (const row of rows) reactions[row._id] = row.count;
  const likes = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  return { likes, reactions };
}

export async function toggleCommentLike(
  user: AuthUser,
  commentId: string,
  type: ReactionType = "LIKE",
) {
  await connectDB();
  const comment = await PostComment.findById(commentId).lean() as any;
  if (!comment || comment.deletedAt) throw new NotFoundError("Commentaire introuvable.");
  await requirePublishedPost(comment.postId);

  const existing = await CommentLike.findOne({ commentId, userId: user.id }).lean() as any;
  if (existing && existing.type === type) {
    await CommentLike.deleteOne({ commentId, userId: user.id });
    const snapshot = await commentReactionSnapshot(commentId);
    return { commentId, liked: false, reaction: null, ...snapshot };
  }
  if (existing) {
    await CommentLike.updateOne({ commentId, userId: user.id }, { $set: { type } });
  } else {
    await CommentLike.create({ commentId, userId: user.id, type });
  }
  const snapshot = await commentReactionSnapshot(commentId);
  return { commentId, liked: true, reaction: type, ...snapshot };
}

export async function listComments(
  postId: string,
  page: number,
  limit: number,
  userId?: string | null,
) {
  await requirePublishedPost(postId);
  await connectDB();
  const skip = (page - 1) * limit;
  const where = { postId, parentId: null };
  const [total, rows] = await Promise.all([
    PostComment.countDocuments(where),
    PostComment.find(where).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
  ]);

  const parentIds = rows.map((c) => String(c._id));
  const replies = await PostComment.find({ postId, parentId: { $in: parentIds } })
    .sort({ createdAt: 1 })
    .lean() as any[];

  const allCommentIds = [...parentIds, ...replies.map((r) => String(r._id))];
  const commentLikes = await CommentLike.find({ commentId: { $in: allCommentIds } }).select("commentId userId type").lean() as any[];
  const likesByComment = new Map<string, CommentLikeRow[]>();
  for (const cl of commentLikes) {
    const arr = likesByComment.get(cl.commentId) ?? [];
    arr.push({ userId: cl.userId, type: cl.type as ReactionType });
    likesByComment.set(cl.commentId, arr);
  }

  const allUserIds = [
    ...(rows as any[]).map((c) => c.userId),
    ...replies.map((r) => r.userId),
  ];
  const users = await getPublicUsers(allUserIds);

  const replyMap = new Map<string, any[]>();
  for (const reply of replies) {
    const arr = replyMap.get(reply.parentId) ?? [];
    arr.push(reply);
    replyMap.set(reply.parentId, arr);
  }

  return {
    items: (rows as any[]).map((c) => ({
      ...withCommentReactions({ ...c, commentLikes: likesByComment.get(String(c._id)) ?? [] }, userId),
      author: publicAuthor(c.userId, users),
      replies: (replyMap.get(String(c._id)) ?? []).map((reply) => ({
        ...withCommentReactions({ ...reply, commentLikes: likesByComment.get(String(reply._id)) ?? [] }, userId),
        author: publicAuthor(reply.userId, users),
      })),
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function createComment(user: AuthUser, postId: string, body: string, parentId?: string) {
  const post = await requirePublishedPost(postId);
  if ((post as any).commentMode === "NONE") {
    throw new ValidationError("Les commentaires sont désactivés sur cette publication.");
  }
  await connectDB();
  if (parentId) {
    const parent = await PostComment.findById(parentId).lean() as any;
    if (!parent || parent.postId !== postId) {
      throw new ValidationError("Le commentaire parent est invalide.");
    }
    if (parent.parentId) {
      throw new ValidationError("Un seul niveau de réponse est autorisé.");
    }
  }
  const comment = await PostComment.create({ postId, userId: user.id, body, parentId: parentId ?? null }) as any;
  return {
    ...toCommentDto(comment),
    author: { id: user.id, email: user.email, name: nameFromEmail(user.email) },
    likes: 0,
    reactions: emptyReactions(),
    viewer: { liked: false, reaction: null },
  };
}

export async function updateComment(user: AuthUser, commentId: string, body: string) {
  await connectDB();
  const comment = await PostComment.findById(commentId).lean() as any;
  if (!comment || comment.deletedAt) throw new NotFoundError("Commentaire introuvable.");
  if (comment.userId !== user.id) throw new ForbiddenError("Vous ne pouvez modifier que votre commentaire.");
  const updated = await PostComment.findByIdAndUpdate(commentId, { $set: { body } }, { new: true }).lean() as any;
  const commentLikes = await CommentLike.find({ commentId }).select("userId type").lean() as any[];
  const likes: CommentLikeRow[] = commentLikes.map((cl) => ({ userId: cl.userId, type: cl.type as ReactionType }));
  return {
    ...withCommentReactions({ ...updated, commentLikes: likes }, user.id),
    author: { id: user.id, email: user.email, name: nameFromEmail(user.email) },
  };
}

export async function deleteComment(user: AuthUser, commentId: string) {
  await connectDB();
  const comment = await PostComment.findById(commentId).lean() as any;
  if (!comment || comment.deletedAt) throw new NotFoundError("Commentaire introuvable.");

  const isAuthor = comment.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  let isPostAuthor = false;
  if (!isAuthor && !isAdmin) {
    const { Post } = await import("@/server/models/post.model");
    const post = await Post.findById(comment.postId).lean() as any;
    isPostAuthor = post?.authorId === user.id;
  }
  if (!isAuthor && !isAdmin && !isPostAuthor) {
    throw new ForbiddenError("Vous ne pouvez pas supprimer ce commentaire.");
  }

  await PostComment.findByIdAndUpdate(commentId, { $set: { deletedAt: new Date(), body: "" } });
  return { deleted: true };
}

/** Persist hide-from-feed so it survives refresh. */
export async function hidePost(user: AuthUser, postId: string) {
  await requirePublishedPost(postId);
  await connectDB();
  await PostHide.findOneAndUpdate(
    { postId, userId: user.id },
    { $setOnInsert: { postId, userId: user.id } },
    { upsert: true }
  );
  return { hidden: true };
}

export async function unhidePost(user: AuthUser, postId: string) {
  await connectDB();
  await PostHide.deleteMany({ postId, userId: user.id });
  return { hidden: false };
}

export async function reportPost(user: AuthUser, postId: string, reason: ReportReason, details?: string) {
  const post = await requirePublishedPost(postId);
  if ((post as any).authorId === user.id) {
    throw new ValidationError("Vous ne pouvez pas signaler votre propre post.");
  }
  await connectDB();
  const existing = await PostReport.findOne({ postId, reporterId: user.id }).select("_id").lean();
  assertNoExistingReport(Boolean(existing));

  const report = await PostReport.create({
    postId,
    reporterId: user.id,
    reason,
    details: details ?? null,
  }) as any;
  return {
    id: String(report._id),
    postId: report.postId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  };
}
