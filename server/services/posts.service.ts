import type { ReactionType } from "@/server/models/engagement.model";
import { connectDB, withDb, mongoose } from "@/server/lib/mongodb";
import { Post } from "@/server/models/post.model";
import {
  PostLike,
  PostBookmark,
  PostPollVote,
  PostHide,
} from "@/server/models/engagement.model";
import { NetworkBlock } from "@/server/models/network.model";
import {
  ForbiddenError,
  JobNotLinkableError,
  NotFoundError,
  PostNotPublishedError,
  UnverifiedCompanyError,
  ValidationError,
} from "@/server/lib/errors";
import {
  companiesByIds,
  companyIdsMatching,
  defaultCompanyId,
  getCompany,
  getJob,
  jobIdsMatching,
  jobsByIds,
  publicCompany,
  publicJob,
} from "@/server/services/catalog";
import { assertCompanyCanPublish } from "@/server/services/posts.rules";
import type { AuthUser } from "@/server/middleware/auth";
import type {
  CompanyPostsQuerySchema,
  CreatePostSchema,
  SearchPostsQuerySchema,
  UpdatePostSchema,
} from "@/server/schemas/posts.schema";
import type { z } from "zod";
import { decorateAuthors } from "@/server/lib/users";
import {
  assertImportedSource,
  excerptFrom,
  normalizeTags,
  preparePublication,
  readCelebration,
  readEvent,
  readMedia,
  readPoll,
} from "@/server/services/posts.rules";
import { sanitizePostContent } from "@/lib/rich-text";

export type PostCategory =
  | "COMPANY_ANNOUNCEMENT"
  | "JOB_OPENING"
  | "INTERNSHIP_ANNOUNCEMENT"
  | "PFE_ANNOUNCEMENT"
  | "OPEN_DAY"
  | "RECRUITMENT_NEWS"
  | "CAREER_ADVICE"
  | "WORKSHOP"
  | "COMPANY_LIFE"
  | "TESTIMONIAL"
  | "SCHOLARSHIP"
  | "CAMPUS_NEWS";
export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "REMOVED";

function withCover(
  media: { type: "image" | "video" | "document"; url: string; name?: string }[],
  cover?: string | null,
) {
  if (!cover) return media;
  if (media.some((item) => item.url === cover)) return media;
  return [{ type: "image" as const, url: cover, name: "cover" }, ...media].slice(0, 4);
}

type CreatePostInput = z.infer<typeof CreatePostSchema>;
type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
type SearchQuery = z.infer<typeof SearchPostsQuerySchema>;
type CompanyListQuery = z.infer<typeof CompanyPostsQuerySchema>;

// Lean Mongoose document shape for posts
type PostDoc = {
  _id: string;
  id?: string;
  authorId: string;
  companyId: string | null;
  jobId: string | null;
  title: string;
  body: string;
  excerpt: string;
  category: PostCategory;
  language: "FR" | "EN";
  source: "MANUAL" | "IMPORTED";
  sourceUrl: string | null;
  sourceName: string | null;
  status: PostStatus;
  postKind: string;
  visibility: "PUBLIC" | "MEMBERS";
  commentMode: "ANYONE" | "CONNECTIONS" | "NONE";
  media: unknown;
  poll: unknown;
  event: unknown;
  celebration: unknown;
  jobDetails?: unknown;
  tags: Array<{ tag?: string }>;
  publishedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { likes: number; comments: number; bookmarks: number; reposts?: number };
};

export type PostDto = ReturnType<typeof toPostDto>;

export function emptyReactions(): Record<string, number> {
  return { LIKE: 0, LOVE: 0, CELEBRATE: 0, INSIGHTFUL: 0, SUPPORT: 0, FUNNY: 0 };
}

export function toPostDto(
  post: PostDoc,
  viewer?: { liked: boolean; bookmarked: boolean; reaction?: ReactionType | null } | null,
  reactions?: Record<ReactionType, number>,
  catalog?: {
    company?: Parameters<typeof publicCompany>[0];
    job?: Parameters<typeof publicJob>[0];
    companyName?: string | null;
  },
) {
  const nextReactions = reactions ?? emptyReactions();
  const counts = post._count ?? { likes: 0, comments: 0, bookmarks: 0, reposts: 0 };
  return {
    id: String(post._id),
    title: post.title,
    body: post.body,
    excerpt: post.excerpt,
    category: post.category,
    status: post.status,
    source: post.source,
    sourceUrl: post.sourceUrl,
    sourceName: post.sourceName,
    language: post.language,
    authorId: post.authorId,
    author: { id: post.authorId, email: null as string | null, name: "" },
    companyId: post.companyId,
    company: publicCompany(catalog?.company ?? null),
    companyName: catalog?.companyName ?? catalog?.company?.name ?? null,
    jobId: post.jobId,
    job: publicJob(catalog?.job ?? null, catalog?.companyName ?? catalog?.company?.name),
    tags: post.tags.map((t) => t.tag ?? "").filter(Boolean),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    archivedAt: post.archivedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    stats: {
      likes: counts.likes,
      comments: counts.comments,
      bookmarks: counts.bookmarks,
      reposts: counts.reposts ?? 0,
      reactions: nextReactions,
    },
    viewer: viewer
      ? {
          liked: viewer.liked,
          bookmarked: viewer.bookmarked,
          reaction: viewer.reaction ?? (viewer.liked ? "LIKE" : null),
        }
      : null,
    postKind: post.postKind,
    visibility: post.visibility,
    commentMode: post.commentMode,
    media: readMedia(post.media),
    poll: readPoll(post.poll),
    event: readEvent(post.event),
    celebration: readCelebration(post.celebration),
    jobDetails: (post.jobDetails ?? null) as PostDoc["jobDetails"],
    coverImageUrl: readMedia(post.media).find((item) => item.type === "image")?.url ?? null,
    ...(() => {
      const opts = readPostOptions(post.event);
      return {
        scheduledAt: opts.scheduledAt ?? null,
        pinnedAt: opts.pinnedAt ?? null,
        repostOfId: opts.repostOfId ?? null,
        mentions: opts.mentions ?? [],
      };
    })(),
    pollResults: null as { counts: number[]; total: number; myOption: number | null } | null,
  };
}

async function reactionMap(postIds: string[]) {
  const map = new Map<string, Record<ReactionType, number>>();
  if (postIds.length === 0) return map;
  const rows = await PostLike.aggregate([
    { $match: { postId: { $in: postIds } } },
    { $group: { _id: { postId: "$postId", type: "$type" }, count: { $sum: 1 } } },
  ]);
  for (const id of postIds) map.set(id, emptyReactions() as Record<ReactionType, number>);
  for (const row of rows) {
    const current = map.get(row._id.postId) ?? (emptyReactions() as Record<ReactionType, number>);
    current[row._id.type as ReactionType] = row.count;
    map.set(row._id.postId, current);
  }
  return map;
}

function assertCanManage(user: AuthUser, authorId: string) {
  if (user.role === "ADMIN" || user.id === authorId) return;
  throw new ForbiddenError("Vous ne pouvez modifier que vos propres posts.");
}

async function resolveCompanyId(user: AuthUser, companyId?: string | null) {
  if (companyId) return companyId;
  return (await defaultCompanyId(user.role, user.email)) ?? null;
}

function extractMentions(text: string, explicit?: string[]) {
  const fromText = [...text.matchAll(/@([a-zA-Z0-9._-]{2,40})/g)].map((m) => m[1].toLowerCase());
  return [...new Set([...(explicit ?? []), ...fromText])].slice(0, 20);
}

type PostOptions = {
  scheduledAt?: string | null;
  pinnedAt?: string | null;
  repostOfId?: string | null;
  mentions?: string[];
};

function readPostOptions(event: unknown): PostOptions {
  if (!event || typeof event !== "object" || Array.isArray(event)) return {};
  const meta = (event as { _options?: unknown })._options;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
  const o = meta as PostOptions;
  return {
    scheduledAt: typeof o.scheduledAt === "string" ? o.scheduledAt : null,
    pinnedAt: typeof o.pinnedAt === "string" ? o.pinnedAt : null,
    repostOfId: typeof o.repostOfId === "string" ? o.repostOfId : null,
    mentions: Array.isArray(o.mentions)
      ? o.mentions.filter((m): m is string => typeof m === "string")
      : [],
  };
}

function withPostOptions(event: unknown, options: PostOptions) {
  const base =
    event && typeof event === "object" && !Array.isArray(event)
      ? { ...(event as Record<string, unknown>) }
      : {};
  delete base._options;
  const clean: PostOptions = {};
  if (options.scheduledAt) clean.scheduledAt = options.scheduledAt;
  if (options.pinnedAt) clean.pinnedAt = options.pinnedAt;
  if (options.repostOfId) clean.repostOfId = options.repostOfId;
  if (options.mentions?.length) clean.mentions = options.mentions;
  if (!clean.scheduledAt && !clean.pinnedAt && !clean.repostOfId && !clean.mentions?.length) {
    return Object.keys(base).length ? base : undefined;
  }
  return { ...base, _options: clean };
}

async function assertJobBelongsToCompany(jobId?: string | null, companyId?: string | null) {
  if (!jobId) return;
  try {
    const job = await getJob(jobId);
    if (!job || job.status === "DRAFT") throw new JobNotLinkableError();
    if (companyId && job.companyId !== companyId) throw new JobNotLinkableError();
  } catch (err) {
    if (err instanceof JobNotLinkableError) throw err;
    // No catalog → ignore job link validation
  }
}

async function assertCanPublishCompany(user: AuthUser, companyId?: string | null) {
  if (user.role === "ADMIN") return;
  if (!companyId) throw new ValidationError("Associez une entreprise à cette publication.");
  const company = await getCompany(companyId);
  if (!company) throw new NotFoundError("Entreprise introuvable.");
  await assertCompanyOwnership(user, company);
  assertCompanyCanPublish(company);
}

async function assertCompanyOwnership(user: AuthUser, companyOrId: Awaited<ReturnType<typeof getCompany>> | string) {
  if (user.role === "ADMIN") return;
  if (user.role !== "COMPANY") throw new ForbiddenError("Seul un compte entreprise peut publier au nom d’une entreprise.");
  const company = typeof companyOrId === "string" ? await getCompany(companyOrId) : companyOrId;
  if (!company) throw new NotFoundError("Entreprise introuvable.");
  const email = user.email.trim().toLowerCase();
  const isOwner = [company.ownerEmail, company.recruiterEmail]
    .some((owner) => owner?.trim().toLowerCase() === email);
  if (!isOwner) throw new ForbiddenError("Vous ne pouvez publier que pour votre propre entreprise.");
}

export async function getPostCounts(postIds: string[]) {
  if (postIds.length === 0) return new Map<string, { likes: number; comments: number; bookmarks: number; reposts: number }>();
  const { PostLike, PostBookmark, PostComment } = await import("@/server/models/engagement.model");
  const [likes, comments, bookmarks, reposts] = await Promise.all([
    PostLike.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    PostComment.aggregate([
      { $match: { postId: { $in: postIds }, deletedAt: null } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    PostBookmark.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    Post.aggregate([
      { $match: { "event._options.repostOfId": { $in: postIds }, status: "PUBLISHED", deletedAt: null } },
      { $group: { _id: "$event._options.repostOfId", count: { $sum: 1 } } },
    ]),
  ]);
  const map = new Map<string, { likes: number; comments: number; bookmarks: number; reposts: number }>();
  for (const id of postIds) map.set(id, { likes: 0, comments: 0, bookmarks: 0, reposts: 0 });
  for (const row of likes) {
    const entry = map.get(row._id);
    if (entry) entry.likes = row.count;
  }
  for (const row of comments) {
    const entry = map.get(row._id);
    if (entry) entry.comments = row.count;
  }
  for (const row of bookmarks) {
    const entry = map.get(row._id);
    if (entry) entry.bookmarks = row.count;
  }
  for (const row of reposts) {
    const entry = map.get(row._id);
    if (entry) entry.reposts = row.count;
  }
  return map;
}

export async function catalogForPosts(posts: Array<{ companyId: string | null; jobId: string | null }>) {
  const companyIds = [...new Set(posts.map((item) => item.companyId).filter(Boolean))] as string[];
  const jobIds = [...new Set(posts.map((item) => item.jobId).filter(Boolean))] as string[];
  try {
    const [companies, jobs] = await Promise.all([companiesByIds(companyIds), jobsByIds(jobIds)]);
    return { companies, jobs };
  } catch {
    return {
      companies: new Map<string, Awaited<ReturnType<typeof getCompany>>>(),
      jobs: new Map<string, Awaited<ReturnType<typeof getJob>>>(),
    };
  }
}

export function catalogSlice(
  post: { companyId: string | null; jobId: string | null },
  maps: Awaited<ReturnType<typeof catalogForPosts>>,
) {
  const company = post.companyId ? maps.companies.get(post.companyId) ?? null : null;
  const job = post.jobId ? maps.jobs.get(post.jobId) ?? null : null;
  const companyName = company?.name ?? (job ? maps.companies.get(job.companyId)?.name : null);
  return { company, job, companyName };
}

async function viewerFlags(postIds: string[], userId?: string) {
  if (!userId || postIds.length === 0) {
    return new Map<string, { liked: boolean; bookmarked: boolean; reaction: ReactionType | null }>();
  }
  const [likes, bookmarks] = await Promise.all([
    PostLike.find({ userId, postId: { $in: postIds } }).select("postId type").lean(),
    PostBookmark.find({ userId, postId: { $in: postIds } }).select("postId").lean(),
  ]);
  const reactionByPost = new Map(likes.map((item: any) => [item.postId, item.type as ReactionType]));
  const bookmarkedSet = new Set(bookmarks.map((l: any) => l.postId));
  const map = new Map<string, { liked: boolean; bookmarked: boolean; reaction: ReactionType | null }>();
  for (const id of postIds) {
    const reaction = reactionByPost.get(id) ?? null;
    map.set(id, { liked: Boolean(reaction), bookmarked: bookmarkedSet.has(id), reaction });
  }
  return map;
}

const NONE_ID = "000000000000000000000000";

async function idsOrNone(ids: string[]) {
  return ids.length ? ids : [NONE_ID];
}

async function pollResultMap(
  posts: Array<{ id?: string; _id?: unknown; postKind: string; poll: unknown }>,
  userId?: string,
) {
  const polls = posts.filter((post) => post.postKind === "POLL" && readPoll(post.poll));
  const map = new Map<string, { counts: number[]; total: number; myOption: number | null }>();
  if (polls.length === 0) return map;
  const ids = polls.map((post) => String(post._id ?? post.id));
  const [grouped, mine] = await Promise.all([
    PostPollVote.aggregate([
      { $match: { postId: { $in: ids } } },
      { $group: { _id: { postId: "$postId", optionIndex: "$optionIndex" }, count: { $sum: 1 } } },
    ]),
    userId
      ? PostPollVote.find({ userId, postId: { $in: ids } }).select("postId optionIndex").lean()
      : Promise.resolve([]),
  ]);
  const mineByPost = new Map((mine as any[]).map((row) => [row.postId, row.optionIndex]));
  for (const post of polls) {
    const postId = String(post._id ?? post.id);
    const poll = readPoll(post.poll)!;
    const counts = poll.options.map(() => 0);
    for (const row of grouped) {
      if (row._id.postId === postId && counts[row._id.optionIndex] !== undefined) {
        counts[row._id.optionIndex] = row.count;
      }
    }
    map.set(postId, {
      counts,
      total: counts.reduce((sum, count) => sum + count, 0),
      myOption: mineByPost.get(postId) ?? null,
    });
  }
  return map;
}

function withPoll<T extends { id: string; pollResults: { counts: number[]; total: number; myOption: number | null } | null }>(
  items: T[],
  polls: Map<string, { counts: number[]; total: number; myOption: number | null }>,
) {
  return items.map((item) => ({ ...item, pollResults: polls.get(item.id) ?? item.pollResults }));
}

async function buildSearchWhere(query: SearchQuery, viewerId?: string) {
  const where: Record<string, unknown> = {
    status: "PUBLISHED",
    deletedAt: null,
    publishedAt: { $lte: new Date() },
  };
  if (!viewerId) {
    where.visibility = "PUBLIC";
  } else {
    // Exclude posts and companies hidden by this viewer.
    const [hiddenPostIds, blockedCompanies] = await Promise.all([
      PostHide.find({ userId: viewerId }).select("postId").lean(),
      NetworkBlock.find({ userId: viewerId }).select("companyId").lean(),
    ]);
    if (hiddenPostIds.length > 0) where._id = { $nin: (hiddenPostIds as any[]).map((h) => h.postId) };
    const blockedIds = (blockedCompanies as unknown as Array<{ companyId: string }>).map((row) => row.companyId);
    if (blockedIds.length > 0) {
      if (query.companyId && blockedIds.includes(query.companyId)) where._id = { $in: [] };
      else where.$and = [{ companyId: { $nin: blockedIds } }];
    }
  }
  if (query.category) where.category = query.category;
  if (query.companyId) where.companyId = query.companyId;
  else if (query.company) where.companyId = { $in: await idsOrNone(await companyIdsMatching(query.company)) };
  if (query.authorId) where.authorId = query.authorId;
  if (query.jobId) where.jobId = query.jobId;
  else if (query.job) where.jobId = { $in: await idsOrNone(await jobIdsMatching(query.job)) };
  if (query.language) where.language = query.language;
  if (query.source) where.source = query.source;
  if (query.tag) where.tags = { $elemMatch: { tag: query.tag.trim().toLowerCase() } };
  if (query.q) {
    const orClauses = await textSearchOr(query.q);
    where.$or = orClauses;
  }
  return where;
}

async function textSearchOr(q: string) {
  const [companyIds, jobIds] = await Promise.all([companyIdsMatching(q), jobIdsMatching(q)]);
  const regex = new RegExp(q, "i");
  const clauses: unknown[] = [
    { title: regex },
    { body: regex },
    { "tags.tag": { $regex: q.toLowerCase(), $options: "i" } },
    { "jobDetails.family": regex },
    { "jobDetails.profession": regex },
    { "jobDetails.location": regex },
    { "jobDetails.governorate": regex },
    { "jobDetails.city": regex },
    { "jobDetails.skills": regex },
    { "jobDetails.requiredSkills": regex },
    { "jobDetails.preferredSkills": regex },
    { "jobDetails.responsibilities": regex },
    { "jobDetails.experience": regex },
    { "jobDetails.education": regex },
  ];
  if (companyIds.length) clauses.push({ companyId: { $in: companyIds } });
  if (jobIds.length) clauses.push({ jobId: { $in: jobIds } });
  return clauses;
}

export async function searchPublishedPosts(query: SearchQuery, userId?: string) {
  await connectDB();
  const where = await buildSearchWhere(query, userId);
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    Post.countDocuments(where),
    Post.find(where)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
  ]);
  const postIds = rows.map((r) => String(r._id));
  const [flags, reactions, catalog, polls, counts] = await Promise.all([
    viewerFlags(postIds, userId),
    reactionMap(postIds),
    catalogForPosts(rows as any),
    pollResultMap(rows as any, userId),
    getPostCounts(postIds),
  ]);
  const dtos = rows.map((p) => {
    const pDoc = { ...(p as any), _count: counts.get(String(p._id)) };
    return toPostDto(pDoc, flags.get(String(p._id)) ?? null, reactions.get(String(p._id)), catalogSlice(p as any, catalog));
  });
  return {
    items: withPoll(await decorateAuthors(dtos), polls),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getPostById(id: string, user?: AuthUser | null) {
  await connectDB();
  const post = await Post.findById(id).lean() as PostDoc | null;
  if (!post || post.deletedAt) throw new NotFoundError("Post introuvable.");
  if (user && post.companyId && await NetworkBlock.exists({ userId: user.id, companyId: post.companyId })) {
    throw new NotFoundError("Post introuvable.");
  }

  if (post.visibility === "MEMBERS" && !user) throw new NotFoundError("Post introuvable.");
  const isPublic = post.status === "PUBLISHED";
  if (!isPublic) {
    if (!user) throw new NotFoundError("Post introuvable.");
    assertCanManage(user, post.authorId);
  }

  const postId = String(post._id);
  const [flags, reactions, polls, counts] = await Promise.all([
    user ? viewerFlags([postId], user.id) : Promise.resolve(new Map()),
    reactionMap([postId]),
    pollResultMap([post], user?.id),
    getPostCounts([postId]),
  ]);
  const catalog = await catalogForPosts([post]);
  const pDoc = { ...post, _count: counts.get(postId) };
  const [dto] = withPoll(
    await decorateAuthors([
      toPostDto(pDoc, flags.get(postId) ?? null, reactions.get(postId), catalogSlice(post, catalog)),
    ]),
    polls,
  );
  return dto;
}

export async function listCompanyPosts(user: AuthUser, query: CompanyListQuery) {
  await connectDB();
  const where: Record<string, unknown> = {
    deletedAt: query.status === "REMOVED" ? undefined : null,
  };
  if (!(user.role === "ADMIN" && !query.companyId)) {
    where.authorId = user.id;
  }
  if (query.companyId) where.companyId = query.companyId;
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.language) where.language = query.language;
  if (query.source) where.source = query.source;
  if (!query.companyId && query.company) {
    where.companyId = { $in: await idsOrNone(await companyIdsMatching(query.company)) };
  }
  if (query.jobId) where.jobId = query.jobId;
  else if (query.job) where.jobId = { $in: await idsOrNone(await jobIdsMatching(query.job)) };
  if (query.tag) where.tags = { $elemMatch: { tag: query.tag.trim().toLowerCase() } };
  if (query.q) where.$or = await textSearchOr(query.q);

  // Remove undefined values
  for (const key of Object.keys(where)) {
    if (where[key] === undefined) delete where[key];
  }

  const skip = (query.page - 1) * query.limit;
  const take = Math.min(query.limit, 20);
  const [total, rows] = await Promise.all([
    Post.countDocuments(where),
    Post.find(where).sort({ updatedAt: -1 }).skip(skip).limit(take).lean(),
  ]);

  const postIds = rows.map((r) => String(r._id));
  const needsPoll = rows.some((p) => (p as any).poll != null);
  const needsCatalog = rows.some((p) => (p as any).companyId || (p as any).jobId);
  const [catalog, polls, counts] = await Promise.all([
    needsCatalog ? catalogForPosts(rows as any) : Promise.resolve({ companies: new Map(), jobs: new Map() } as Awaited<ReturnType<typeof catalogForPosts>>),
    needsPoll ? pollResultMap(rows as any, user.id) : Promise.resolve(new Map()),
    getPostCounts(postIds),
  ]);

  const author = {
    id: user.id,
    email: user.email,
    name: user.email.split("@")[0] || "Vous",
  };

  const items = withPoll(
    rows.map((p) => {
      const pDoc = { ...(p as any), _count: counts.get(String(p._id)) };
      const dto = toPostDto(pDoc, null, emptyReactions(), catalogSlice(p as any, catalog));
      const c = counts.get(String(p._id)) ?? { likes: 0, comments: 0, bookmarks: 0 };
      return {
        ...dto,
        author,
        likes: c.likes,
        commentsCount: c.comments,
        bookmarks: c.bookmarks,
      };
    }),
    polls,
  );

  return {
    items,
    page: query.page,
    limit: take,
    total,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}

export async function createPost(user: AuthUser, input: CreatePostInput) {
  await connectDB();
  const source = input.source ?? "MANUAL";
  assertImportedSource(source, input.sourceUrl);
  const linked = preparePublication({
    role: user.role,
    postKind: input.postKind,
    category: input.category,
    visibility: input.visibility,
    commentMode: input.commentMode,
    media: input.media,
    poll: input.poll,
    event: input.event,
    celebration: input.celebration,
  });

  const publish = input.publish !== false;
  const companyId = user.role === "CANDIDATE" ? null : input.companyId ?? await resolveCompanyId(user, null);
  if (user.role === "COMPANY" && companyId) await assertCompanyOwnership(user, companyId);
  if (user.role === "COMPANY" && input.jobId && !companyId) {
    throw new ValidationError("Associez une entreprise avant de lier une offre.");
  }
  if (input.jobId) {
    await assertJobBelongsToCompany(input.jobId, companyId);
  }
  if (publish && (linked.requiresCompany || linked.postKind === "JOB")) await assertCanPublishCompany(user, companyId);

  const tags = normalizeTags(input.tags);
  const now = new Date();
  const body = sanitizePostContent(input.body);
  const media = withCover(linked.media, input.coverImageUrl);
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const scheduleFuture = Boolean(scheduledAt && scheduledAt.getTime() > now.getTime());
  const willPublish = publish && !scheduleFuture;
  const publishedAt = willPublish ? now : scheduleFuture && scheduledAt ? scheduledAt : null;
  const mentions = extractMentions(body, input.mentions);

  if (input.repostOfId) {
    const original = await Post.findById(input.repostOfId).lean() as PostDoc | null;
    if (!original || original.deletedAt || original.status !== "PUBLISHED") {
      throw new NotFoundError("Publication d'origine introuvable.");
    }
  }

  const postDoc = new Post({
    companyId,
    jobId: input.jobId ?? null,
    authorId: user.id,
    title: input.title,
    body,
    excerpt: input.excerpt?.trim() || excerptFrom(body),
    category: linked.category as PostCategory,
    language: input.language ?? "FR",
    source,
    sourceUrl: source === "IMPORTED" ? input.sourceUrl! : input.sourceUrl ?? null,
    sourceName: input.sourceName ?? null,
    status: willPublish || scheduleFuture ? "PUBLISHED" : "DRAFT",
    publishedAt,
    postKind: linked.postKind,
    visibility: linked.visibility,
    commentMode: linked.commentMode,
    media,
    poll: linked.poll ?? null,
    event: withPostOptions(linked.event, {
      scheduledAt: scheduledAt?.toISOString() ?? null,
      pinnedAt: input.pinned ? now.toISOString() : null,
      repostOfId: input.repostOfId ?? null,
      mentions,
    }),
    celebration: linked.celebration ?? null,
    jobDetails: input.jobDetails ?? null,
    tags: tags.map((tag) => ({ tag })),
  });
  const saved = await postDoc.save();
  const post = saved.toObject() as PostDoc;

  const postCompany = await getCompany(companyId);
  const dto = toPostDto({ ...post, _count: { likes: 0, comments: 0, bookmarks: 0 } }, null, undefined, {
    company: postCompany,
    job: null,
    companyName: postCompany?.name ?? null,
  });
  return {
    ...dto,
    author: {
      id: user.id,
      email: user.email,
      name: user.email.split("@")[0] || "Vous",
    },
  };
}

export async function updatePost(user: AuthUser, postId: string, input: UpdatePostInput) {
  await connectDB();
  const existing = await Post.findById(postId).lean() as PostDoc | null;
  if (!existing || existing.deletedAt) throw new NotFoundError("Post introuvable.");
  if (existing.status === "REMOVED" && user.role !== "ADMIN") {
    throw new ForbiddenError("Ce post a été retiré par la modération.");
  }
  assertCanManage(user, existing.authorId);

  const source = input.source ?? existing.source;
  const sourceUrl = input.sourceUrl === undefined ? existing.sourceUrl : input.sourceUrl;
  assertImportedSource(source, sourceUrl);

  const companyId =
    input.companyId === undefined
      ? existing.companyId
      : input.companyId ?? (await resolveCompanyId(user, null));
  if (user.role === "COMPANY" && companyId) await assertCompanyOwnership(user, companyId);

  let jobId = existing.jobId;
  if (input.unlinkJob) jobId = null;
  else if (input.jobId !== undefined) jobId = input.jobId ?? null;
  if (user.role === "COMPANY" && jobId && !companyId) {
    throw new ValidationError("Associez une entreprise avant de lier une offre.");
  }
  await assertJobBelongsToCompany(jobId, companyId);

  const tags = input.tags ? normalizeTags(input.tags) : null;
  const body = input.body === undefined ? existing.body : sanitizePostContent(input.body);
  const media =
    input.coverImageUrl === undefined ? undefined : withCover(readMedia(existing.media), input.coverImageUrl);
  const existingJobDetails =
    existing.jobDetails && typeof existing.jobDetails === "object"
      ? (existing.jobDetails as { applicationUrl?: unknown })
      : null;

  const updateData: Record<string, unknown> = {
    title: input.title ?? existing.title,
    body,
    excerpt:
      input.excerpt === undefined
        ? excerptFrom(body)
        : input.excerpt?.trim() || excerptFrom(body),
    category: input.category ?? existing.category,
    language: input.language ?? existing.language,
    source,
    sourceUrl,
    sourceName: input.sourceName === undefined ? existing.sourceName : input.sourceName,
    companyId,
    jobId,
    postKind: input.postKind ?? existing.postKind,
    jobDetails:
      input.jobDetails === undefined
        ? (input.postKind ?? existing.postKind) === "JOB" || Boolean(existingJobDetails?.applicationUrl)
          ? existing.jobDetails ?? null
          : null
        : input.jobDetails,
  };
  if (media) updateData.media = media;
  if (tags) updateData.tags = tags.map((tag) => ({ tag }));

  const post = await Post.findByIdAndUpdate(postId, { $set: updateData }, { new: true }).lean() as PostDoc | null;
  if (!post) throw new NotFoundError("Post introuvable.");
  const counts = await getPostCounts([String(post._id)]);
  const pDoc = { ...post, _count: counts.get(String(post._id)) };
  const catalog = await catalogForPosts([post]);
  const [dto] = await decorateAuthors([toPostDto(pDoc, null, undefined, catalogSlice(post, catalog))]);
  return dto;
}

async function setStatus(user: AuthUser, postId: string, next: PostStatus) {
  await connectDB();
  const existing = await Post.findById(postId).lean() as PostDoc | null;
  if (!existing || existing.deletedAt) throw new NotFoundError("Post introuvable.");
  assertCanManage(user, existing.authorId);

  if (existing.status === "REMOVED" && user.role !== "ADMIN") {
    throw new ForbiddenError("Ce post a été retiré par la modération.");
  }

  const now = new Date();
  const updateData: Record<string, unknown> = {
    status: next,
    publishedAt: next === "PUBLISHED" ? existing.publishedAt ?? now : existing.publishedAt,
    archivedAt: next === "ARCHIVED" ? now : next === "PUBLISHED" ? null : existing.archivedAt,
    deletedAt: null,
  };

  const post = await Post.findByIdAndUpdate(postId, { $set: updateData }, { new: true }).lean() as PostDoc | null;
  if (!post) throw new NotFoundError("Post introuvable.");
  const counts = await getPostCounts([String(post._id)]);
  const pDoc = { ...post, _count: counts.get(String(post._id)) };
  const catalog = await catalogForPosts([post]);
  const [dto] = await decorateAuthors([toPostDto(pDoc, null, undefined, catalogSlice(post, catalog))]);
  return dto;
}

export async function publishPost(user: AuthUser, postId: string) {
  await connectDB();
  const existing = await Post.findById(postId).lean() as PostDoc | null;
  if (!existing || existing.deletedAt) throw new NotFoundError("Post introuvable.");
  assertCanManage(user, existing.authorId);
  if (existing.postKind === "JOB") {
    if (user.role === "COMPANY" && existing.companyId) await assertCompanyOwnership(user, existing.companyId);
    await assertCanPublishCompany(user, existing.companyId ?? (await resolveCompanyId(user, null)));
  }
  await assertJobBelongsToCompany(existing.jobId, existing.companyId);
  return setStatus(user, postId, "PUBLISHED");
}

export async function archivePost(user: AuthUser, postId: string) {
  return setStatus(user, postId, "ARCHIVED");
}

export async function deletePost(user: AuthUser, postId: string) {
  await connectDB();
  const existing = await Post.findById(postId).lean() as PostDoc | null;
  if (!existing || existing.deletedAt) throw new NotFoundError("Post introuvable.");
  assertCanManage(user, existing.authorId);

  if (existing.status === "DRAFT") {
    await Post.findByIdAndDelete(postId);
    return { deleted: true, hard: true };
  }

  await Post.findByIdAndUpdate(postId, { $set: { status: "REMOVED", deletedAt: new Date() } });
  return { deleted: true, hard: false };
}

export async function votePoll(user: AuthUser, postId: string, optionIndex: number) {
  const post = await requirePublishedPost(postId);
  const poll = readPoll((post as any).poll);
  if ((post as any).postKind !== "POLL" || !poll) throw new ValidationError("Cette publication n'est pas un sondage.");
  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    throw new ValidationError("Choix de sondage invalide.");
  }
  if (new Date(poll.closesAt).getTime() < Date.now()) {
    throw new ValidationError("Ce sondage est terminé.");
  }
  await PostPollVote.findOneAndUpdate(
    { postId, userId: user.id },
    { $set: { optionIndex } },
    { upsert: true, new: true }
  );
  const polls = await pollResultMap([post as any], user.id);
  return polls.get(postId) ?? { counts: poll.options.map(() => 0), total: 0, myOption: optionIndex };
}

export async function requirePublishedPost(postId: string) {
  await connectDB();
  const post = await Post.findById(postId).lean() as PostDoc | null;
  if (!post || post.deletedAt) throw new NotFoundError("Post introuvable.");
  if (post.status !== "PUBLISHED") throw new PostNotPublishedError();
  return post;
}

export async function getPostForEngagement(postId: string, user?: AuthUser | null) {
  await connectDB();
  const post = await Post.findById(postId).lean() as PostDoc | null;
  if (!post || post.deletedAt) throw new NotFoundError("Post introuvable.");
  if (user && post.companyId && await NetworkBlock.exists({ userId: user.id, companyId: post.companyId })) {
    throw new NotFoundError("Post introuvable.");
  }
  if (post.status === "PUBLISHED") return post;
  if (!user) throw new NotFoundError("Post introuvable.");
  assertCanManage(user, post.authorId);
  return post;
}

export async function pinPost(user: AuthUser, postId: string, pinned = true) {
  await connectDB();
  const existing = await Post.findById(postId).lean() as PostDoc | null;
  if (!existing || existing.deletedAt) throw new NotFoundError("Post introuvable.");
  assertCanManage(user, existing.authorId);
  const prev = readPostOptions(existing.event);
  const newEvent = withPostOptions(existing.event, {
    ...prev,
    pinnedAt: pinned ? new Date().toISOString() : null,
  });

  const post = await Post.findByIdAndUpdate(postId, { $set: { event: newEvent } }, { new: true }).lean() as PostDoc | null;
  if (!post) throw new NotFoundError("Post introuvable.");
  const counts = await getPostCounts([String(post._id)]);
  const pDoc = { ...post, _count: counts.get(String(post._id)) };
  const catalog = await catalogForPosts([post]);
  const [dto] = await decorateAuthors([
    toPostDto(pDoc, null, undefined, catalogSlice(post, catalog)),
  ]);
  return dto;
}

export async function repostPost(user: AuthUser, postId: string, commentary?: string) {
  await connectDB();
  const original = await Post.findById(postId).lean() as PostDoc | null;
  if (!original || original.deletedAt || original.status !== "PUBLISHED") {
    throw new NotFoundError("Publication d'origine introuvable.");
  }
  const note = commentary?.trim();
  const originalMedia = readMedia(original.media);
  const postKind = note
    ? "TEXT"
    : original.postKind === "PHOTO" || original.postKind === "VIDEO" || original.postKind === "DOCUMENT"
      ? original.postKind
      : "TEXT";
  const companyId =
    user.role === "CANDIDATE"
      ? undefined
      : (await resolveCompanyId(user, original.companyId)) ?? undefined;
  const baseTitle = original.title.replace(/^(Republication ·\s*)+/i, "").trim() || original.title;
  return createPost(user, {
    title: note ? titleFromNote(note, baseTitle) : `Republication · ${baseTitle}`.slice(0, 200),
    body: note || original.body,
    category: original.category,
    tags: original.tags.map((t) => t.tag ?? "").filter(Boolean),
    language: original.language,
    source: "MANUAL",
    publish: true,
    postKind,
    visibility: "PUBLIC",
    commentMode: "ANYONE",
    media: note ? [] : originalMedia,
    coverImageUrl: note
      ? undefined
      : originalMedia.find((item) => item.type === "image")?.url ?? undefined,
    repostOfId: original._id,
    companyId,
  });
}

function titleFromNote(note: string, fallback: string) {
  const line = note.split("\n").map((p) => p.trim()).find(Boolean) ?? fallback;
  return line.slice(0, 180).padEnd(3, ".");
}
