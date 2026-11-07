"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { usePosts } from "@/hooks/use-posts";
import type { PostCategory, ReportReason } from "@/types/post";
import { EmptyState } from "@/components/layout/empty-state";
import { CandidatePostCard } from "@/components/candidate/candidate-post-card";
import { FeedLeftRail, FeedRightRail } from "@/components/posts/feed-rail";
import { PostListSkeleton } from "@/components/posts/post-list";
import { ReportDialog } from "@/components/posts/report-dialog";
import { buttonVariants } from "@/components/ui/button";

export function HubFeedPage({
  title,
  description,
  category,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  headerExtra,
}: {
  title: string;
  description: string;
  category: PostCategory;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  headerExtra?: ReactNode;
}) {
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const {
    posts,
    error,
    isLoading,
    hasMore,
    loadingMore,
    like,
    bookmark,
    comment,
    report,
    hide,
    loadMore,
    refresh,
  } = usePosts("PUBLISHED", { category });

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  async function guarded<T>(action: () => Promise<T>, fallback: string) {
    if (!user) {
      setNotice("Connectez-vous pour liker, commenter ou enregistrer.");
      return;
    }
    try {
      const result = await action();
      setNotice("");
      return result;
    } catch (err) {
      setNotice(err instanceof Error ? err.message : fallback);
      throw err;
    }
  }

  return (
    <>
      <div className="sa-feed-shell flex items-start justify-center gap-6 px-3 py-6 sm:px-4">
        <FeedLeftRail />

        <div className="w-full max-w-[var(--sa-feed-center)] min-w-0 space-y-2.5">
          <div className="sa-feed-banner">
            <div className="relative z-[1]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                SmartApply
              </p>
              <h1 className="sa-display mt-1 text-[22px] font-bold leading-tight text-[var(--sa-ink)] sm:text-[24px]">
                {title}
              </h1>
              <p className="mt-1 max-w-[42ch] text-[13px] leading-5 text-[var(--sa-text-secondary)]">
                {description}
              </p>
              {headerExtra}
            </div>
          </div>

          {notice ? (
            <p className="sa-card px-4 py-3 text-sm text-[#2563eb]">
              {notice}{" "}
              {!user ? (
                <Link href="/login" className="font-semibold underline">
                  Connexion
                </Link>
              ) : null}
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {isLoading ? (
            <PostListSkeleton />
          ) : posts.length === 0 ? (
            <div className="sa-card p-6">
              <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                action={
                  <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Retour au fil
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <CandidatePostCard
                  key={post.id}
                  post={post}
                  onLike={(id, type) => void guarded(() => like(id, type), "Réaction impossible.")}
                  onBookmark={(id) => void guarded(() => bookmark(id), "Favori impossible.")}
                  onComment={(id, content, parentId) =>
                    void guarded(() => comment(id, content, parentId), "Commentaire impossible.")
                  }
                  onHide={(id) =>
                    void guarded(async () => {
                      await hide(id);
                      setNotice("Post masqué.");
                    }, "Masquage impossible.")
                  }
                  onReport={(id) => setReportId(id)}
                />
              ))}
            </div>
          )}

          {hasMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              className="sa-btn-secondary mx-auto block"
            >
              {loadingMore ? "Chargement…" : "Voir plus"}
            </button>
          ) : null}
        </div>

        <FeedRightRail
          onTag={(tag) => {
            window.location.href = `/?tag=${encodeURIComponent(tag)}`;
          }}
        />
      </div>

      <ReportDialog
        open={Boolean(reportId)}
        onOpenChange={(open) => {
          if (!open) setReportId(null);
        }}
        onSubmit={(reason: ReportReason, details: string) => {
          if (!reportId) return;
          void guarded(() => report(reportId, reason, details), "Signalement impossible.").then(
            () => {
              setNotice("Signalement envoyé.");
              setReportId(null);
            },
          );
        }}
      />
    </>
  );
}
