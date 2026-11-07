"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, X } from "lucide-react";
import { isUuid } from "@/lib/mappers";
import { takeNewPost } from "@/lib/repost-flash";
import { useAuth } from "@/hooks/use-auth";
import { usePosts } from "@/hooks/use-posts";
import type { PostCategory, ReportReason } from "@/types/post";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";
import { CandidatePostCard } from "@/components/candidate/candidate-post-card";
import { FeedLeftRail, FeedRightRail } from "@/components/posts/feed-rail";
import { FeedCategoryChips } from "@/components/posts/feed-filters";
import { PostComposer } from "@/components/posts/post-composer";
import { PostListSkeleton } from "@/components/posts/post-list";
import { ReportDialog } from "@/components/posts/report-dialog";
import { DeletePostDialog } from "@/components/posts/delete-post-dialog";
import { JobMatchesWidget } from "@/components/candidate/job-matches-widget";
import { cn } from "@/lib/utils";

export function CandidateFeed() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<PostCategory | "tous">(
    (searchParams.get("category") as PostCategory | null) ?? "tous",
  );
  const [tag, setTag] = useState(searchParams.get("tag") ?? "");
  const [companyId, setCompanyId] = useState(searchParams.get("company") ?? "");
  const [jobId, setJobId] = useState(searchParams.get("job") ?? "");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [notice, setNotice] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [box, setBox] = useState<"feed" | "mine" | "drafts">(
    searchParams.get("box") === "mine"
      ? "mine"
      : searchParams.get("box") === "drafts"
        ? "drafts"
        : "feed",
  );
  const [sort, setSort] = useState<"recent" | "relevant">("recent");

  function pushFilters(next: {
    q?: string;
    category?: PostCategory | "tous";
    tag?: string;
    company?: string;
    job?: string;
    box?: "feed" | "mine" | "drafts";
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const apply = (key: string, value?: string) => {
      if (value && value !== "tous" && value !== "feed") params.set(key, value);
      else params.delete(key);
    };
    if (next.q !== undefined) apply("q", next.q.trim() || undefined);
    if (next.category !== undefined) apply("category", next.category);
    if (next.tag !== undefined) apply("tag", next.tag || undefined);
    if (next.company !== undefined) apply("company", next.company || undefined);
    if (next.job !== undefined) apply("job", next.job || undefined);
    if (next.box !== undefined) {
      if (next.box === "feed") params.delete("box");
      else params.set("box", next.box);
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTag(searchParams.get("tag") ?? "");
      setCompanyId(searchParams.get("company") ?? "");
      setJobId(searchParams.get("job") ?? "");
      setQuery(searchParams.get("q") ?? "");
      const nextCategory = searchParams.get("category");
      setCategory(nextCategory ? (nextCategory as PostCategory) : "tous");
      const nextBox = searchParams.get("box");
      if (nextBox === "mine" || nextBox === "drafts") setBox(nextBox);
      else if (!nextBox) setBox("feed");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const scope = box === "drafts" ? "DRAFT" : "PUBLISHED";
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
    remove,
    hide,
    loadMore,
    prepend,
    refresh,
  } = usePosts(
      scope,
      {
        q: query,
        category,
        tag,
        companyId: isUuid(companyId) ? companyId : undefined,
        company: companyId && !isUuid(companyId) ? companyId : undefined,
        jobId: isUuid(jobId) ? jobId : undefined,
        job: jobId && !isUuid(jobId) ? jobId : undefined,
      },
      { mine: box !== "feed" },
    );

  useEffect(() => {
    const created = takeNewPost();
    const fromQuery = searchParams.get("reposted") === "1";
    if (!created && !fromQuery) return;
    const timer = window.setTimeout(() => {
      setBox("feed");
      setSort("recent");
      setNotice("Votre republication est en ligne — en haut du fil.");
      if (created) prepend(created);
      void refresh();
      if (fromQuery) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("reposted");
        const qs = params.toString();
        router.replace(qs ? `/?${qs}` : "/");
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted =
    sort === "relevant"
      ? [...posts].sort((a, b) => b.likes + b.commentsCount - (a.likes + a.commentsCount))
      : posts;

  async function guarded<T>(action: () => Promise<T>, fallback: string) {
    if (!user) {
      setNotice("Connectez-vous pour liker, commenter, enregistrer ou signaler.");
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

  const filtersActive = Boolean(query || category !== "tous" || tag || companyId || jobId);

  return (
    <>
      <div className="sa-feed-shell flex items-start justify-center gap-6 px-3 py-6 sm:px-4">
        <FeedLeftRail active={box === "feed" ? "feed" : box === "mine" ? "mine" : "drafts"} />

        <div className="w-full max-w-[var(--sa-feed-center)] min-w-0 space-y-2.5">
          <div className="sa-feed-banner">
            <div className="relative z-[1] min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                SmartApply
              </p>
              <h1 className="sa-display mt-1 text-[22px] font-bold leading-tight text-[var(--sa-ink)] sm:text-[24px]">
                Le fil carrière{" "}
                <span className="text-[#2563eb]">Tunisie</span>
              </h1>
              <p className="mt-1 max-w-[42ch] text-[13px] leading-5 text-[var(--sa-text-secondary)]">
                Offres, conseils et actus recrutement — en un seul fil.
              </p>
            </div>
          </div>

          {user?.role === "CANDIDATE" && box === "feed" ? <JobMatchesWidget /> : null}

          {!user ? (
            <div className="sa-card p-4">
              <p className="text-[15px] font-semibold tracking-tight text-[var(--sa-text)]">
                Bienvenue sur SmartApply
              </p>
              <p className="mt-1 text-[13px] leading-5 text-[var(--sa-text-secondary)]">
                Publiez, suivez des entreprises et postulez en un clic.
              </p>
            </div>
          ) : (
            <PostComposer
              role={user.role}
              onCreated={(status) => {
                setNotice(
                  status === "DRAFT"
                    ? "Brouillon enregistré."
                    : "Publication enregistrée.",
                );
                setBox(status === "DRAFT" ? "drafts" : "mine");
              }}
            />
          )}

          <div className="flex items-center gap-2 px-0.5 py-0.5">
            <div className="h-px flex-1 bg-[var(--sa-divider)]" />
            <button
              type="button"
              onClick={() => setSort((value) => (value === "relevant" ? "recent" : "relevant"))}
              className="shrink-0 rounded-full px-2 py-1 text-[12px] text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-hover)] hover:text-[#2563eb]"
            >
              Trier par :{" "}
              <span className="font-semibold text-[var(--sa-text)]">
                {sort === "relevant" ? "Pertinents" : "Récents"}
              </span>
              <span className="ml-0.5 text-[#2563eb]">▾</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <FeedCategoryChips
              value={category}
              onChange={(value) => {
                setCategory(value);
                pushFilters({ category: value });
              }}
            />
            {filtersActive ? (
              <div className="flex flex-wrap items-center gap-2 px-1">
                {tag ? (
                  <span className="rounded-full bg-[var(--sa-action-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--sa-action)]">
                    #{tag}
                  </span>
                ) : null}
                {companyId ? (
                  <span className="rounded-full bg-[var(--sa-surface-soft)] px-2.5 py-0.5 text-[12px] font-semibold">
                    Entreprise
                  </span>
                ) : null}
                {query ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sa-surface-soft)] px-2.5 py-0.5 text-[12px] font-semibold">
                    « {query} »
                    <button
                      type="button"
                      aria-label="Effacer"
                      onClick={() => {
                        setQuery("");
                        pushFilters({ q: "" });
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {notice ? (
            <p className="sa-card px-4 py-3 text-sm text-[var(--sa-action)]">
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
          ) : sorted.length === 0 ? (
            <div className="sa-card p-6">
              <EmptyState
                icon={<FileText className="size-5" />}
                title="Aucune publication"
                description={
                  filtersActive
                    ? "Aucun résultat pour ces filtres."
                    : box === "feed"
                      ? "Commencez un post pour animer le fil."
                      : "Rien dans cet espace pour le moment."
                }
                action={
                  filtersActive ? (
                    <button
                      type="button"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                      onClick={() => {
                        setCategory("tous");
                        setTag("");
                        setCompanyId("");
                        setJobId("");
                        setQuery("");
                        pushFilters({
                          q: "",
                          category: "tous",
                          tag: "",
                          company: "",
                          job: "",
                        });
                      }}
                    >
                      Tout afficher
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((post) => (
                <CandidatePostCard
                  key={post.id}
                  post={post}
                  onLike={(id, type) => guarded(() => like(id, type), "Réaction impossible.")}
                  onBookmark={(id) => guarded(() => bookmark(id), "Favori impossible.")}
                  onComment={(id, content, parentId) =>
                    guarded(() => comment(id, content, parentId), "Commentaire impossible.")
                  }
                  onTag={(value) => {
                    setTag(value);
                    pushFilters({ tag: value });
                  }}
                  onHide={(id) =>
                    void guarded(async () => {
                      await hide(id);
                      setNotice("Cette publication est masquée de votre fil.");
                    }, "Masquage impossible.")
                  }
                  onReport={(id) => {
                    if (!user) {
                      setNotice("Connectez-vous pour signaler un post.");
                      return;
                    }
                    setReportId(id);
                  }}
                  onDelete={(id) => setDeletePostId(id)}
                />
              ))}
            </div>
          )}

          {hasMore && box === "feed" ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Chargement…" : "Voir plus de posts"}
            </button>
          ) : null}
        </div>

        <FeedRightRail
          onTag={(value) => {
            setTag(value);
            pushFilters({ tag: value });
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
              setNotice("Signalement envoyé. Un administrateur va l’examiner.");
            },
          );
        }}
      />
      <DeletePostDialog
        open={Boolean(deletePostId)}
        onOpenChange={(open) => {
          if (!open) setDeletePostId(null);
        }}
        onConfirm={() => {
          if (!deletePostId) return;
          const id = deletePostId;
          void guarded(async () => {
            await remove(id);
            setNotice("Votre publication a été supprimée.");
          }, "Suppression impossible.");
        }}
      />
    </>
  );
}

