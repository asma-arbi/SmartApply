import { api } from "@/lib/api";
import { CATEGORIES } from "@/lib/constants";
import { isUuid, mapComment, mapPost, mapReport } from "@/lib/mappers";
import { toPostPayload } from "@/lib/post-payload";
import type {
  ApiComment,
  ApiPost,
  ApiReport,
  AuthUser,
  ModerateAction,
  Post,
  PostCategory,
  PostInput,
  PostLanguage,
  PostOrigin,
  PostStatus,
  PollResults,
  ReactionType,
  ReportReason,
} from "@/types/post";

type Page<T> = { items: T[]; total: number };

export type PostFilters = {
  q?: string;
  category?: PostCategory | "tous";
  tag?: string;
  language?: PostLanguage | "tous";
  origin?: PostOrigin | "tous";
  companyId?: string;
  company?: string;
  authorId?: string;
  jobId?: string;
  job?: string;
};

function withFilters(params: URLSearchParams, filters?: PostFilters) {
  if (filters?.q) params.set("q", filters.q);
  if (filters?.category && filters.category !== "tous") params.set("category", filters.category);
  if (filters?.tag) params.set("tag", filters.tag);
  if (filters?.language && filters.language !== "tous") params.set("language", filters.language);
  if (filters?.origin && filters.origin !== "tous") {
    params.set("source", filters.origin === "imported" ? "IMPORTED" : "MANUAL");
  }
  if (filters?.companyId && isUuid(filters.companyId)) params.set("companyId", filters.companyId);
  else if (filters?.company?.trim()) params.set("company", filters.company.trim());
  if (filters?.authorId && isUuid(filters.authorId)) params.set("authorId", filters.authorId);
  if (filters?.jobId && isUuid(filters.jobId)) params.set("jobId", filters.jobId);
  else if (filters?.job?.trim()) params.set("job", filters.job.trim());
}

export async function searchPublishedPage(
  query: PostFilters = {},
  user?: AuthUser | null,
  page = 1,
) {
  const params = new URLSearchParams({ limit: "10", page: String(page) });
  withFilters(params, query);
  const data = await api<Page<ApiPost> & { totalPages?: number; page?: number }>(
    `/posts?${params.toString()}`,
  );
  return {
    items: data.items.map((item) => mapPost(item, user)),
    total: data.total,
    page: data.page ?? page,
    totalPages: data.totalPages ?? 1,
  };
}

export async function searchPublishedPosts(
  query: PostFilters = {},
  user?: AuthUser | null,
): Promise<Post[]> {
  const data = await searchPublishedPage(query, user, 1);
  return data.items;
}

export async function searchCompanyPosts(
  status: PostStatus,
  user?: AuthUser | null,
  filters?: PostFilters,
): Promise<Post[]> {
  const params = new URLSearchParams({ status, limit: "20" });
  withFilters(params, filters);
  const data = await api<Page<ApiPost>>(`/company/posts?${params.toString()}`);
  return data.items.map((item) => mapPost(item, user));
}

export async function fetchBookmarks(user?: AuthUser | null): Promise<Post[]> {
  const data = await api<{ items?: Array<ApiPost | { post?: ApiPost | null }> }>("/me/bookmarks?limit=50");
  return (data.items ?? [])
    .map((item) => {
      if ("id" in item && typeof item.id === "string") return item;
      if ("post" in item) return item.post ?? null;
      return null;
    })
    .filter((post): post is ApiPost => Boolean(post?.id))
    .map((post) =>
      mapPost(
        { ...post, viewer: { liked: post.viewer?.liked ?? false, bookmarked: true } },
        user,
      ),
    );
}

export async function fetchCommentsApi(id: string, user?: AuthUser | null) {
  const data = await api<Page<ApiComment>>(`/posts/${id}/comments?limit=100`);
  return data.items.map((item) => mapComment(item, user));
}

export async function fetchPost(id: string, user?: AuthUser | null): Promise<Post> {
  const data = await api<{ post: ApiPost }>(`/posts/${id}`);
  const post = mapPost(data.post, user);
  try {
    post.comments = await fetchCommentsApi(id, user);
  } catch {
    post.comments = [];
  }
  return post;
}

export async function createPostApi(input: PostInput, user?: AuthUser | null) {
  const data = await api<{ post: ApiPost }>("/posts", {
    method: "POST",
    body: JSON.stringify(toPostPayload(input)),
  });
  return mapPost(data.post, user);
}

export async function updatePostApi(id: string, input: PostInput, user?: AuthUser | null) {
  const payload = toPostPayload(input, true);
  const data = await api<{ post: ApiPost }>(`/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (input.status === "PUBLISHED") {
    const published = await api<{ post?: ApiPost } | ApiPost>(`/posts/${id}/publish`, {
      method: "POST",
    });
    const post = "post" in published && published.post ? published.post : (published as ApiPost);
    if (post && "id" in post) return mapPost(post, user);
  }
  if (input.status === "ARCHIVED") {
    await api(`/posts/${id}/archive`, { method: "POST" });
  }
  return mapPost(data.post, user);
}

export async function deletePostApi(id: string) {
  await api(`/posts/${id}`, { method: "DELETE" });
}

export async function publishPostApi(id: string, user?: AuthUser | null) {
  const data = await api<{ post: ApiPost }>(`/posts/${id}/publish`, { method: "POST" });
  return mapPost(data.post, user);
}

export async function archivePostApi(id: string, user?: AuthUser | null) {
  const data = await api<{ post: ApiPost }>(`/posts/${id}/archive`, { method: "POST" });
  return mapPost(data.post, user);
}

export async function moderatePostApi(
  id: string,
  action: ModerateAction,
  reason: string,
  user?: AuthUser | null,
) {
  const data = await api<{ post: ApiPost }>(`/admin/posts/${id}/moderate`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
  return mapPost(data.post, user);
}

export async function toggleLikeApi(id: string, type: ReactionType = "LIKE") {
  return api<{
    liked: boolean;
    likes: number;
    reaction: ReactionType | null;
    reactions: Record<ReactionType, number>;
  }>(`/posts/${id}/like`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

export async function votePollApi(id: string, optionIndex: number) {
  return api<{ pollResults: PollResults }>(`/posts/${id}/poll`, {
    method: "POST",
    body: JSON.stringify({ optionIndex }),
  });
}

export async function toggleBookmarkApi(id: string) {
  return api<{ bookmarked: boolean; bookmarks: number }>(`/posts/${id}/bookmark`, {
    method: "POST",
  });
}

export async function pinPostApi(id: string, pinned = true, user?: AuthUser | null) {
  const data = await api<{ post: ApiPost }>(`/posts/${id}/pin`, {
    method: "POST",
    body: JSON.stringify({ pinned }),
  });
  return mapPost(data.post, user);
}

export async function repostPostApi(id: string, commentary?: string, user?: AuthUser | null) {
  const data = await api<{ post: ApiPost }>(`/posts/${id}/repost`, {
    method: "POST",
    body: JSON.stringify(commentary ? { commentary } : {}),
  });
  return mapPost(data.post, user);
}

export async function hidePostApi(id: string) {
  return api<{ hidden: boolean }>(`/posts/${id}/hide`, { method: "POST" });
}

export async function unhidePostApi(id: string) {
  return api<{ hidden: boolean }>(`/posts/${id}/hide`, { method: "DELETE" });
}

export async function toggleCommentLikeApi(commentId: string, type: ReactionType = "LIKE") {
  return api<{
    commentId: string;
    liked: boolean;
    likes: number;
    reaction: ReactionType | null;
    reactions: Record<ReactionType, number>;
  }>(`/comments/${commentId}/like`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

export async function addCommentApi(
  id: string,
  body: string,
  user?: AuthUser | null,
  parentId?: string,
) {
  const data = await api<{ comment: ApiComment }>(`/posts/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, parentId }),
  });
  return mapComment(data.comment, user);
}

export async function updateCommentApi(commentId: string, body: string, user?: AuthUser | null) {
  const data = await api<{ comment: ApiComment }>(`/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
  return mapComment(data.comment, user);
}

export async function deleteCommentApi(commentId: string) {
  await api(`/comments/${commentId}`, { method: "DELETE" });
}

export async function reportPostApi(id: string, reason: ReportReason, details: string) {
  return api(`/posts/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ reason, details: details || undefined }),
  });
}

export async function fetchReports(
  status: "PENDING" | "DISMISSED" | "ACTIONED" | "all",
  user?: AuthUser | null,
) {
  const params = new URLSearchParams({ limit: "50" });
  if (status !== "all") params.set("status", status);
  const data = await api<Page<ApiReport>>(`/admin/posts/reports?${params.toString()}`);
  return data.items.map((item) => mapReport(item, user));
}

export async function reviewReportApi(
  id: string,
  action: "dismiss" | "archive" | "delete",
) {
  if (action === "dismiss") {
    return api(`/admin/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "DISMISSED", reviewNote: "Ignoré depuis SmartApply" }),
    });
  }
  return api(`/admin/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "ACTIONED",
      reviewNote: action === "delete" ? "Post retiré" : "Post archivé",
      action: action === "delete" ? "REMOVE" : "UNPUBLISH",
    }),
  });
}

export type FeedSidebarData = {
  myStats: {
    publishedPosts: number;
    draftPosts: number;
    reactionsReceived: number;
    commentsReceived: number;
    bookmarks: number;
    profileViews: number;
    impressions: number;
  };
  trendingTags: Array<{ tag: string; count: number }>;
  careerTips: Array<{ id: string; title: string; excerpt: string }>;
  suggestedCompanies: Array<{
    id: string;
    name: string;
    city: string;
    sector: string;
    isVerified: boolean;
    jobsCount: number;
  }>;
  suggestedCandidates: Array<{
    id: string;
    name: string;
    headline: string;
    bio: string;
    city: string;
    avatarUrl: string | null;
    skills: string[];
  }>;
};

export async function fetchFeedSidebar() {
  return api<FeedSidebarData>("/feed/sidebar");
}

export async function loginApi(email: string, password: string) {
  return api<{
    accessToken: string;
    user: AuthUser;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerApi(input: { name: string; email: string; password: string }) {
  return api<{
    accessToken: string;
    expiresAt: number;
    user: AuthUser;
  }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function isValidCategory(value: string): value is PostCategory {
  return CATEGORIES.some((item) => item.value === value);
}
