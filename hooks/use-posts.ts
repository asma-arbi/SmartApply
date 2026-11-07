"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLiveFeed } from "@/hooks/use-live-feed";
import {
  createPostAction,
  deletePostAction,
  getPostAction,
  listCompanyPostsAction,
  searchPostsAction,
  setPostStatusAction,
  updatePostAction,
  moderatePostAction,
} from "@/server/actions/posts.actions";
import {
  createCommentAction,
  deleteCommentAction,
  hidePostAction,
  listBookmarksAction,
  reportPostAction,
  toggleBookmarkAction,
  toggleCommentLikeAction,
  toggleLikeAction,
  updateCommentAction,
} from "@/server/actions/engagement.actions";
import { listReportsAction, reviewReportAction } from "@/server/actions/admin.actions";
import type { PostDto } from "@/server/services/posts.service";
import { toPostPayload } from "@/lib/post-payload";
import { mapComment, mapPost, mapReport } from "@/lib/mappers";
import type { PostFilters } from "@/lib/posts-api";
import type {
  ModerateAction,
  Post,
  PostInput,
  PostStatus,
  ReactionType,
  Report,
  ReportReason,
} from "@/types/post";

type Scope = "PUBLISHED" | "DRAFT" | "ARCHIVED" | "REMOVED" | "bookmarks";

const asApiPost = (post: PostDto) => post as unknown as import("@/types/post").ApiPost;

function actionFilters(filters?: PostFilters) {
  return {
    q: filters?.q || undefined,
    category: filters?.category && filters.category !== "tous" ? filters.category : undefined,
    tag: filters?.tag || undefined,
    language: filters?.language && filters.language !== "tous" ? filters.language : undefined,
    source: filters?.origin && filters.origin !== "tous"
      ? filters.origin === "imported" ? "IMPORTED" : "MANUAL"
      : undefined,
    companyId: filters?.companyId || undefined,
    company: filters?.company || undefined,
    authorId: filters?.authorId || undefined,
    jobId: filters?.jobId || undefined,
    job: filters?.job || undefined,
  };
}

export function usePosts(
  scope: Scope = "PUBLISHED",
  filters?: PostFilters,
  options?: { mine?: boolean },
) {
  const { user, ready } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const filterQuery = filters?.q;
  const filterCategory = filters?.category;
  const filterTag = filters?.tag;
  const filterLanguage = filters?.language;
  const filterOrigin = filters?.origin;
  const filterCompanyId = filters?.companyId;
  const filterCompany = filters?.company;
  const filterAuthorId = filters?.authorId;
  const filterJobId = filters?.jobId;
  const filterJob = filters?.job;
  const mineOnly = options?.mine;
  const normalizedFilters = useMemo(
    () => actionFilters({
      q: filterQuery,
      category: filterCategory,
      tag: filterTag,
      language: filterLanguage,
      origin: filterOrigin,
      companyId: filterCompanyId,
      company: filterCompany,
      authorId: filterAuthorId,
      jobId: filterJobId,
      job: filterJob,
    }),
    [
      filterQuery,
      filterCategory,
      filterTag,
      filterLanguage,
      filterOrigin,
      filterCompanyId,
      filterCompany,
      filterAuthorId,
      filterJobId,
      filterJob,
    ],
  );

  const refresh = useCallback(async () => {
    setError("");
    try {
      if ((mineOnly || scope !== "PUBLISHED") && !user) {
        setPosts([]);
        setHasMore(false);
        return;
      }
      let next: Post[] = [];
      let more = false;
      if (scope === "bookmarks") {
        const result = await listBookmarksAction(1, 50);
        next = result.items.map((item) => mapPost(asApiPost(item.post), user));
      } else if (mineOnly || scope === "DRAFT" || scope === "ARCHIVED" || scope === "REMOVED") {
        const result = await listCompanyPostsAction({ ...normalizedFilters, status: scope, limit: 50 });
        next = result.data.items.map((item) => mapPost(asApiPost(item), user));
      } else {
        const result = await searchPostsAction({ ...normalizedFilters, page: 1, limit: 10 });
        const page = result.data;
        next = page.items.map((item) => mapPost(asApiPost(item), user));
        more = page.page < page.totalPages;
        pageRef.current = 1;
      }
      setPosts(next);
      setHasMore(more);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les posts.");
      setPosts((current) => (current.length ? current : []));
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [scope, normalizedFilters, mineOnly, user]);

  useEffect(() => {
    if (!ready) return;
    const refreshTimer = window.setTimeout(() => {
      setLoading(true);
      void refresh();
    }, 0);
    // Hard stop skeleton if network/DB stalls past client timeout.
    const failSafe = window.setTimeout(() => setLoading(false), 10_000);
    return () => {
      window.clearTimeout(refreshTimer);
      window.clearTimeout(failSafe);
    };
  }, [ready, refresh]);

  useEffect(() => {
    function onPostsChanged() {
      if (ready) void refresh();
    }
    window.addEventListener("smartapply:posts-changed", onPostsChanged);
    return () => window.removeEventListener("smartapply:posts-changed", onPostsChanged);
  }, [ready, refresh]);

  useLiveFeed(() => {
    if (ready) void refresh();
  }, ready);

  const prepend = useCallback((post: Post) => {
    setPosts((current) => (current.some((item) => item.id === post.id) ? current : [post, ...current]));
  }, []);

  return {
    posts,
    error,
    isLoading: loading,
    hasMore,
    loadingMore,
    refresh,
    prepend,
    loadMore: async () => {
      if (!hasMore || loadingMore || options?.mine || scope !== "PUBLISHED") return;
      setLoadingMore(true);
      try {
        const nextPage = pageRef.current + 1;
        const result = await searchPostsAction({ ...normalizedFilters, page: nextPage, limit: 10 });
        const page = result.data;
        pageRef.current = nextPage;
        setPosts((current) => {
          const seen = new Set(current.map((post) => post.id));
          return [...current, ...page.items.map((item) => mapPost(asApiPost(item), user)).filter((post) => !seen.has(post.id))];
        });
        setHasMore(nextPage < page.totalPages);
      } finally {
        setLoadingMore(false);
      }
    },
    add: async (input: PostInput) => {
      const result = await createPostAction(toPostPayload(input));
      return mapPost(asApiPost(result.data), user);
    },
    edit: async (id: string, input: PostInput) => {
      const result = await updatePostAction(id, toPostPayload(input, true), input.status);
      const updated = mapPost(asApiPost(result.data), user);
      setPosts((current) => current.map((post) => post.id === id ? updated : post));
      return updated;
    },
    remove: async (id: string) => {
      await deletePostAction(id);
      setPosts((current) => current.filter((post) => post.id !== id));
    },
    like: async (id: string, type: ReactionType = "LIKE") => {
      let previous: Post | undefined;
      setPosts((current) =>
        current.map((post) => {
          if (post.id !== id) return post;
          previous = post;
          const removing = post.reaction === type;
          const reactions = { ...post.reactions };
          if (post.reaction) reactions[post.reaction] = Math.max(0, reactions[post.reaction] - 1);
          if (!removing) reactions[type] = (reactions[type] ?? 0) + 1;
          const likes = Object.values(reactions).reduce((sum, count) => sum + count, 0);
          return {
            ...post,
            liked: !removing,
            reaction: removing ? null : type,
            reactions,
            likes,
          };
        }),
      );
      try {
        const result = await toggleLikeAction(id, type);
        setPosts((current) =>
          current.map((post) =>
            post.id === id
              ? {
                  ...post,
                  liked: result.liked,
                  likes: result.likes,
                  reaction: result.reaction,
                  reactions: result.reactions,
                }
              : post,
          ),
        );
        window.dispatchEvent(new Event("smartapply:analytics-updated"));
        return result;
      } catch (err) {
        if (previous) {
          const snapshot = previous;
          setPosts((current) => current.map((post) => (post.id === id ? snapshot : post)));
        }
        throw err;
      }
    },
    bookmark: async (id: string) => {
      const result = await toggleBookmarkAction(id);
      setPosts((current) => {
        if (scope === "bookmarks" && !result.bookmarked) {
          return current.filter((post) => post.id !== id);
        }
        return current.map((post) =>
          post.id === id
            ? { ...post, bookmarked: result.bookmarked, bookmarks: result.bookmarks }
            : post,
        );
      });
      if (scope === "bookmarks" && result.bookmarked) await refresh();
      return result;
    },
    hide: async (id: string) => {
      await hidePostAction(id);
      setPosts((current) => current.filter((post) => post.id !== id));
    },
    setStatus: async (id: string, status: PostStatus) => {
      await setPostStatusAction(id, status);
      await refresh();
    },
    restore: async (id: string) => {
      await moderatePostAction(id, "RESTORE", "Restauré depuis SmartApply");
      await refresh();
    },
    comment: async (postId: string, content: string, parentId?: string) => {
      await createCommentAction(postId, content, parentId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, commentsCount: post.commentsCount + 1 } : post,
        ),
      );
      window.dispatchEvent(new Event("smartapply:analytics-updated"));
    },
    report: (postId: string, reason: ReportReason, details: string) =>
      reportPostAction(postId, reason, details),
    review: async (reportId: string, action: "dismiss" | "archive" | "delete", reviewNote?: string) => {
      if (action === "dismiss") {
        await reviewReportAction(reportId, "DISMISSED", reviewNote?.trim() || "Ignoré depuis SmartApply");
      } else {
        await reviewReportAction(reportId, "ACTIONED", reviewNote?.trim() || (action === "delete" ? "Post retiré" : "Post dépublié"), action === "delete" ? "REMOVE" : "UNPUBLISH");
      }
    },
  };
}

export function usePost(id: string) {
  const { user, ready } = useAuth();
  const [post, setPost] = useState<Post | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await getPostAction(id);
      setPost(mapPost(asApiPost(result.data), user));
      setError("");
    } catch (err) {
      setPost(undefined);
      setError(err instanceof Error ? err.message : "Post introuvable.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [ready, refresh]);

  useLiveFeed(() => {
    if (ready) void refresh();
  }, ready && Boolean(id));

  return {
    post,
    error,
    isLoading: loading,
    refresh,
    edit: async (input: PostInput) => {
      const result = await updatePostAction(id, toPostPayload(input, true), input.status);
      const updated = mapPost(asApiPost(result.data), user);
      setPost(updated);
      return updated;
    },
    remove: () => deletePostAction(id),
    like: async (type: ReactionType = "LIKE") => {
      const result = await toggleLikeAction(id, type);
      setPost((current) =>
        current
          ? {
              ...current,
              liked: result.liked,
              likes: result.likes,
              reaction: result.reaction,
              reactions: result.reactions,
            }
          : current,
      );
      window.dispatchEvent(new Event("smartapply:analytics-updated"));
    },
    bookmark: async () => {
      const result = await toggleBookmarkAction(id);
      setPost((current) =>
        current
          ? { ...current, bookmarked: result.bookmarked, bookmarks: result.bookmarks }
          : current,
      );
      return result;
    },
    setStatus: async (status: PostStatus) => {
      const result = await setPostStatusAction(id, status);
      setPost(mapPost(asApiPost(result.data), user));
    },
    moderate: async (action: ModerateAction, reason: string) => {
      const result = await moderatePostAction(id, action, reason);
      setPost(mapPost(asApiPost(result.data), user));
    },
    comment: async (content: string, parentId?: string) => {
      const raw = await createCommentAction(id, content, parentId);
      const created = mapComment(raw.data as unknown as import("@/types/post").ApiComment, user);
      setPost((current) => {
        if (!current) return current;
        if (parentId) {
          return {
            ...current,
            commentsCount: current.commentsCount + 1,
            comments: current.comments.map((item) =>
              item.id === parentId
                ? { ...item, replies: [...(item.replies ?? []), created] }
                : item,
            ),
          };
        }
        return {
          ...current,
          comments: [...current.comments, created],
          commentsCount: current.commentsCount + 1,
        };
      });
      window.dispatchEvent(new Event("smartapply:analytics-updated"));
    },
    editComment: async (commentId: string, content: string) => {
      const result = await updateCommentAction(commentId, content);
      const updated = mapComment(result as unknown as import("@/types/post").ApiComment, user);
      setPost((current) => {
        if (!current) return current;
        return {
          ...current,
          comments: current.comments.map((item) => {
            if (item.id === commentId) return { ...item, ...updated, replies: item.replies };
            return {
              ...item,
              replies: (item.replies ?? []).map((reply) =>
                reply.id === commentId ? { ...reply, ...updated } : reply,
              ),
            };
          }),
        };
      });
    },
    reactComment: async (commentId: string, type: ReactionType = "LIKE") => {
      const result = await toggleCommentLikeAction(commentId, type);
      setPost((current) => {
        if (!current) return current;
        return {
          ...current,
          comments: current.comments.map((item) => {
            if (item.id === commentId) {
              return {
                ...item,
                liked: result.liked,
                likes: result.likes,
                reaction: result.reaction,
                reactions: result.reactions,
              };
            }
            return {
              ...item,
              replies: (item.replies ?? []).map((reply) =>
                reply.id === commentId
                  ? {
                      ...reply,
                      liked: result.liked,
                      likes: result.likes,
                      reaction: result.reaction,
                      reactions: result.reactions,
                    }
                  : reply,
              ),
            };
          }),
        };
      });
    },
    deleteComment: async (commentId: string) => {
      await deleteCommentAction(commentId);
      setPost((current) => {
        if (!current) return current;
        return {
          ...current,
          comments: current.comments.map((item) => {
            if (item.id === commentId) {
              return { ...item, deleted: true, content: "(commentaire supprimé)" };
            }
            return {
              ...item,
              replies: (item.replies ?? []).map((reply) =>
                reply.id === commentId
                  ? { ...reply, deleted: true, content: "(commentaire supprimé)" }
                  : reply,
              ),
            };
          }),
        };
      });
      window.dispatchEvent(new Event("smartapply:analytics-updated"));
    },
    report: (reason: ReportReason, details: string) => reportPostAction(id, reason, details),
  };
}

export function useReports(status: Report["status"] | "all" = "PENDING") {
  const { user, ready } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ PENDING: 0, ACTIONED: 0, DISMISSED: 0 });

  const refresh = useCallback(async () => {
    if (!ready) return;
    if (user?.role !== "ADMIN") {
      setReports([]);
      setCounts({ PENDING: 0, ACTIONED: 0, DISMISSED: 0 });
      setLoading(false);
      return;
    }
    try {
      const result = await listReportsAction(status === "all" ? undefined : status, 1, 50);
      setReports(result.items.map((item) => mapReport(item as unknown as import("@/types/post").ApiReport, user)));
      setCounts({ PENDING: result.counts.PENDING ?? 0, ACTIONED: result.counts.ACTIONED ?? 0, DISMISSED: result.counts.DISMISSED ?? 0 });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les signalements.");
    } finally {
      setLoading(false);
    }
  }, [ready, status, user]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [ready, refresh]);

  useLiveFeed(() => {
    if (ready && user?.role === "ADMIN") void refresh();
  }, ready && user?.role === "ADMIN");

  return {
    reports,
    counts,
    error,
    isLoading: loading,
    refresh,
    review: async (reportId: string, action: "dismiss" | "archive" | "delete", reviewNote?: string) => {
      if (action === "dismiss") {
        await reviewReportAction(reportId, "DISMISSED", reviewNote?.trim() || "Ignoré depuis SmartApply");
      } else {
        await reviewReportAction(reportId, "ACTIONED", reviewNote?.trim() || (action === "delete" ? "Post retiré" : "Post dépublié"), action === "delete" ? "REMOVE" : "UNPUBLISH");
      }
      await refresh();
    },
  };
}
