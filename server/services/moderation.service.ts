import type { ModerationAction } from "@/server/models/engagement.model";
import { connectDB } from "@/server/lib/mongodb";
import { Post } from "@/server/models/post.model";
import { PostReport, PostModerationLog } from "@/server/models/engagement.model";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import type { AuthUser } from "@/server/middleware/auth";
import { decorateAuthors, getPublicUsers, publicAuthor } from "@/server/lib/users";
import { catalogForPosts, catalogSlice, toPostDto } from "@/server/services/posts.service";

export type { ModerationAction };

async function getPostWithCounts(postId: string) {
  const post = await Post.findById(postId).lean() as any;
  if (!post) return null;
  const { PostLike, PostBookmark, PostComment } = await import("@/server/models/engagement.model");
  const pid = String(post._id);
  const [likes, comments, bookmarks] = await Promise.all([
    PostLike.countDocuments({ postId: pid }),
    PostComment.countDocuments({ postId: pid, deletedAt: null }),
    PostBookmark.countDocuments({ postId: pid }),
  ]);
  return { ...post, _count: { likes, comments, bookmarks } };
}

export async function listReports(
  status: "PENDING" | "DISMISSED" | "ACTIONED" | undefined,
  page: number,
  limit: number,
) {
  await connectDB();
  const where = status ? { status } : {};
  const skip = (page - 1) * limit;
  const [total, rows, statusRows] = await Promise.all([
    PostReport.countDocuments(where),
    PostReport.find(where).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PostReport.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const postIds = [...new Set((rows as any[]).map((r) => r.postId))];
  const posts = await Promise.all(postIds.map((id) => getPostWithCounts(id)));
  const postMap = new Map(posts.filter(Boolean).map((p) => [String(p!._id), p!]));
  const reasonRows = postIds.length
    ? await PostReport.aggregate([
        { $match: { postId: { $in: postIds } } },
        { $group: { _id: { postId: "$postId", reason: "$reason" }, count: { $sum: 1 } } },
      ])
    : [];
  const reasonsByPost = new Map<string, Array<{ reason: string; count: number }>>();
  const reportCountByPost = new Map<string, number>();
  for (const row of reasonRows as Array<{ _id: { postId: string; reason: string }; count: number }>) {
    const reasons = reasonsByPost.get(row._id.postId) ?? [];
    reasons.push({ reason: row._id.reason, count: row.count });
    reasonsByPost.set(row._id.postId, reasons);
    reportCountByPost.set(row._id.postId, (reportCountByPost.get(row._id.postId) ?? 0) + row.count);
  }

  const allUserIds = [
    ...(rows as any[]).map((r) => r.reporterId),
    ...posts.filter(Boolean).map((p) => p!.authorId),
  ];
  const [authors, catalog] = await Promise.all([
    getPublicUsers(allUserIds),
    catalogForPosts(posts.filter(Boolean).map((p) => ({ companyId: p!.companyId, jobId: p!.jobId }))),
  ]);

  return {
    items: (rows as any[]).map((r) => {
      const post = postMap.get(r.postId);
      return {
        id: String(r._id),
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        reviewNote: r.reviewNote,
        postReportCount: reportCountByPost.get(r.postId) ?? 1,
        reasonCounts: reasonsByPost.get(r.postId) ?? [{ reason: r.reason, count: 1 }],
        reporter: publicAuthor(r.reporterId, authors),
        post: post
          ? {
              ...toPostDto(post, null, undefined, catalogSlice(post, catalog)),
              author: publicAuthor(post.authorId, authors),
            }
          : null,
      };
    }),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts: (statusRows as Array<{ _id: string; count: number }>).reduce(
      (result, row) => ({ ...result, [row._id]: row.count }),
      { PENDING: 0, ACTIONED: 0, DISMISSED: 0 } as Record<string, number>,
    ),
  };
}

async function applyModeration(
  admin: AuthUser,
  postId: string,
  action: ModerationAction,
  reason: string,
) {
  const existing = await Post.findById(postId).lean();
  if (!existing) throw new NotFoundError("Post introuvable.");

  const now = new Date();
  const updateData: Record<string, unknown> = {};
  if (action === "UNPUBLISH") {
    updateData.status = "DRAFT";
    updateData.archivedAt = null;
    updateData.deletedAt = null;
  } else if (action === "REMOVE") {
    updateData.status = "REMOVED";
    updateData.deletedAt = now;
  } else if (action === "RESTORE") {
    updateData.status = "ARCHIVED";
    updateData.deletedAt = null;
  }

  const [post] = await Promise.all([
    Post.findByIdAndUpdate(postId, { $set: updateData }, { new: true }).lean(),
    PostModerationLog.create({ postId, adminId: admin.id, action, reason }),
  ]);
  if (!post) throw new NotFoundError("Post introuvable.");
  const postWithCounts = await getPostWithCounts(postId);
  const catalog = await catalogForPosts([post as any]);
  const [dto] = await decorateAuthors([toPostDto(postWithCounts as any, null, undefined, catalogSlice(post as any, catalog))]);
  return dto;
}

export async function moderatePost(
  admin: AuthUser,
  postId: string,
  action: ModerationAction,
  reason: string,
) {
  await connectDB();
  if (action === "DISMISS_REPORTS") {
    const existing = await getPostWithCounts(postId);
    if (!existing) throw new NotFoundError("Post introuvable.");
    await Promise.all([
      PostReport.updateMany(
        { postId, status: "PENDING" },
        { $set: { status: "DISMISSED", reviewedById: admin.id, reviewedAt: new Date(), reviewNote: reason } },
      ),
      PostModerationLog.create({ postId, adminId: admin.id, action, reason }),
    ]);
    const catalog = await catalogForPosts([existing]);
    const [dto] = await decorateAuthors([
      toPostDto(existing, null, undefined, catalogSlice(existing, catalog)),
    ]);
    return dto;
  }
  const post = await applyModeration(admin, postId, action, reason);
  if (action === "UNPUBLISH" || action === "REMOVE") {
    await PostReport.updateMany(
      { postId, status: "PENDING" },
      { $set: { status: "ACTIONED", reviewedById: admin.id, reviewedAt: new Date(), reviewNote: reason } },
    );
  }
  return post;
}

export async function reviewReport(
  admin: AuthUser,
  reportId: string,
  status: "DISMISSED" | "ACTIONED",
  reviewNote?: string,
  action?: ModerationAction,
) {
  await connectDB();
  const report = await PostReport.findById(reportId).lean() as any;
  if (!report) throw new NotFoundError("Signalement introuvable.");
  if (report.status !== "PENDING") throw new ValidationError("Ce signalement a déjà été traité.");
  const decisionNote = reviewNote?.trim().slice(0, 1000) || null;

  if (status === "ACTIONED") {
    const nextAction = action ?? "UNPUBLISH";
    if (nextAction === "DISMISS_REPORTS") {
      throw new ValidationError("ACTIONED nécessite UNPUBLISH, REMOVE ou RESTORE.");
    }
    await moderatePost(admin, report.postId, nextAction, decisionNote || `Signalement ${report.reason}`);
  }

  const updated = await PostReport.findByIdAndUpdate(
    reportId,
    {
      $set: {
        status,
        reviewedById: admin.id,
        reviewedAt: new Date(),
        reviewNote: decisionNote,
      },
    },
    { new: true },
  ).lean() as any;
  return {
    id: String(updated._id),
    status: updated.status,
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    reviewNote: updated.reviewNote,
  };
}
