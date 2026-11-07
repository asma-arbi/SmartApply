import { excerptFrom } from "@/lib/format";
import type { AuthUser, ApiComment, ApiPost, ApiReport, Comment, Post, Report } from "@/types/post";
import { emptyReactions } from "@/types/post";

function initialsFrom(value: string) {
  const clean = value.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || "U").toUpperCase();
}

function displayName(value: string) {
  return value.includes("@") ? value.split("@")[0] : value;
}

export function authorFrom(
  source: string | { id: string; name?: string | null; email?: string | null },
  currentUser?: AuthUser | null,
) {
  const id = typeof source === "string" ? source : source.id;
  const fromApi =
    typeof source === "string" ? "" : source.name?.trim() || source.email?.trim() || "";
  const raw =
    fromApi ||
    (currentUser && currentUser.id === id ? currentUser.email : "") ||
    "Utilisateur";
  const name = displayName(raw);
  return {
    id,
    name,
    initials: initialsFrom(name),
  };
}

export function mapPost(dto: ApiPost, currentUser?: AuthUser | null): Post {
  return {
    id: dto.id,
    title: dto.title,
    content: dto.body,
    excerpt: dto.excerpt ?? excerptFrom(dto.body),
    author: authorFrom(dto.author ?? { id: "", name: null, email: null }, currentUser),
    category: dto.category,
    tags: dto.tags ?? [],
    status: dto.status,
    origin: dto.source === "IMPORTED" ? "imported" : "manual",
    language: dto.language ?? "FR",
    sourceUrl: dto.sourceUrl ?? undefined,
    sourceLabel: dto.sourceName ?? undefined,
    coverImageUrl:
      dto.coverImageUrl ??
      dto.media?.find((item) => item.type === "image")?.url ??
      undefined,
    companyId: dto.companyId ?? undefined,
    companyName: dto.companyName ?? undefined,
    jobId: dto.jobId ?? undefined,
    jobTitle: dto.jobTitle ?? undefined,
    likes: dto.stats?.likes ?? 0,
    bookmarks: dto.stats?.bookmarks ?? 0,
    liked: dto.viewer?.liked ?? false,
    bookmarked: dto.viewer?.bookmarked ?? false,
    reaction: dto.viewer?.reaction ?? (dto.viewer?.liked ? "LIKE" : null),
    reactions: { ...emptyReactions(), ...dto.stats?.reactions },
    commentsCount: dto.stats?.comments ?? 0,
    reposts: dto.stats?.reposts ?? 0,
    comments: [],
    createdAt: dto.createdAt ?? dto.updatedAt,
    updatedAt: dto.updatedAt,
    postKind: dto.postKind ?? "TEXT",
    visibility: dto.visibility ?? "PUBLIC",
    commentMode: dto.commentMode ?? "ANYONE",
    media: dto.media ?? [],
    poll: dto.poll ?? null,
    event: dto.event ?? null,
    celebration: dto.celebration ?? null,
    jobDetails: dto.jobDetails ?? null,
    pollResults: dto.pollResults ?? null,
    repostOfId: dto.repostOfId ?? null,
  };
}

export function mapComment(dto: ApiComment, currentUser?: AuthUser | null): Comment {
  return {
    id: dto.id,
    content: dto.deleted || !dto.body ? "(commentaire supprimé)" : dto.body,
    author: authorFrom(dto.author.id, currentUser),
    createdAt: dto.createdAt,
    parentId: dto.parentId ?? undefined,
    deleted: dto.deleted,
    likes: dto.likes ?? 0,
    liked: dto.viewer?.liked ?? false,
    reaction: dto.viewer?.reaction ?? (dto.viewer?.liked ? "LIKE" : null),
    reactions: { ...emptyReactions(), ...dto.reactions },
    replies: (dto.replies ?? []).map((reply) => mapComment(reply, currentUser)),
  };
}

export function mapReport(dto: ApiReport, currentUser?: AuthUser | null): Report {
  return {
    id: dto.id,
    postId: dto.post?.id ?? "",
    reason: dto.reason,
    details: dto.details ?? "",
    status: dto.status,
    reporterName: authorFrom(dto.reporter, currentUser).name,
    createdAt: dto.createdAt,
    postTitle: dto.post?.title,
    postContent: dto.post?.body,
    postAuthorName: dto.post?.author?.name ?? undefined,
    postReportCount: dto.postReportCount ?? 1,
    reasonCounts: dto.reasonCounts ?? [{ reason: dto.reason, count: 1 }],
    reviewedAt: dto.reviewedAt ?? null,
    reviewNote: dto.reviewNote ?? null,
  };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{24}$/i.test(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
