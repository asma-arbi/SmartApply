"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, FileText, PenLine, Search, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMyCompany } from "@/hooks/use-catalog";
import { usePosts } from "@/hooks/use-posts";
import { getCachedFeedSidebar } from "@/lib/sidebar-cache";
import { isUuid } from "@/lib/mappers";
import type { Post, PostCategory } from "@/types/post";
import { DeletePostDialog } from "@/components/posts/delete-post-dialog";
import { FeedCategoryChips } from "@/components/posts/feed-filters";
import { FeedLeftRail, FeedRightRail } from "@/components/posts/feed-rail";
import { PostComposer } from "@/components/posts/post-composer";
import { PostList, PostListSkeleton } from "@/components/posts/post-list";
import { takeNewPost } from "@/lib/repost-flash";
import { cn } from "@/lib/utils";

type Scope = "PUBLISHED" | "DRAFT" | "ARCHIVED";

const SCOPES: { value: Scope; label: string; icon: typeof Send }[] = [
  { value: "PUBLISHED", label: "Publiés", icon: Send },
  { value: "DRAFT", label: "Brouillons", icon: FileText },
  { value: "ARCHIVED", label: "Archives", icon: Archive },
];

export function CompanyWorkspace() {
  const { user } = useAuth();
  const { company } = useMyCompany();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [category, setCategory] = useState<PostCategory | "tous">("tous");
  const [scope, setScope] = useState<Scope>(
    searchParams.get("box") === "drafts" ? "DRAFT" : "PUBLISHED",
  );
  const previousBox = useRef(searchParams.get("box"));
  const [toDelete, setToDelete] = useState<Post | null>(null);
  const [notice, setNotice] = useState("");
  const [counts, setCounts] = useState({ PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 });
  const [browseCompany, setBrowseCompany] = useState<{ id: string; name?: string } | null>(() => {
    const id = searchParams.get("company");
    return id && isUuid(id) ? { id } : null;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const box = searchParams.get("box");
    const leavingDrafts = previousBox.current === "drafts" && box !== "drafts";
    previousBox.current = box;
    const timer = window.setTimeout(() => {
      if (box === "drafts") setScope("DRAFT");
      else if (leavingDrafts) setScope("PUBLISHED");
      const q = searchParams.get("q");
      if (q != null) setQuery(q);
      const companyId = searchParams.get("company");
      if (companyId && isUuid(companyId)) {
        setBrowseCompany((current) =>
          current?.id === companyId ? current : { id: companyId, name: current?.name },
        );
        setScope("PUBLISHED");
      } else if (!companyId) {
        setBrowseCompany(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const browsing = Boolean(browseCompany?.id);
  const {
    posts,
    error,
    isLoading,
    like,
    bookmark,
    comment,
    remove,
    setStatus,
    restore,
    refresh,
    prepend,
  } = usePosts(
      browsing ? "PUBLISHED" : scope,
      {
        q: debouncedQuery,
        category,
        companyId: browseCompany?.id,
      },
      { mine: !browsing },
    );

  const refreshCounts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getCachedFeedSidebar(true, user?.id ?? "guest");
      setCounts((current) => ({
        ...current,
        PUBLISHED: data.myStats.publishedPosts,
        DRAFT: data.myStats.draftPosts,
      }));
    } catch {
      /* keep */
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshCounts(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshCounts]);

  useEffect(() => {
    const created = takeNewPost();
    const fromQuery = searchParams.get("reposted") === "1";
    if (!created && !fromQuery) return;
    const timer = window.setTimeout(() => {
      setBrowseCompany(null);
      setScope("PUBLISHED");
      setNotice("Votre republication est en ligne — en haut de la liste.");
      if (created) prepend(created);
      void refresh().then(() => refreshCounts());
      if (fromQuery) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("reposted");
        const qs = params.toString();
        router.replace(qs ? `/company?${qs}` : "/company");
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!browsing) {
      const timer = window.setTimeout(
        () => setCounts((current) => ({ ...current, [scope]: posts.length })),
        0,
      );
      return () => window.clearTimeout(timer);
    }
  }, [browsing, posts.length, scope]);

  function clearBrowseCompany() {
    setBrowseCompany(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("company");
    const qs = params.toString();
    router.replace(qs ? `/company?${qs}` : "/company");
  }

  function openCompany(next: { id: string; name: string }) {
    router.push(`/entreprises/${encodeURIComponent(next.id)}`);
  }

  async function guarded<T>(action: () => Promise<T>, fallback: string) {
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
    <div className="sa-feed-shell flex items-start justify-center gap-5 px-3 py-5 sm:px-4">
      <FeedLeftRail
        active={scope === "DRAFT" ? "drafts" : scope === "PUBLISHED" ? "mine" : "feed"}
      />

      <div className="w-full max-w-[var(--sa-feed-center)] min-w-0 space-y-2">
        {user && !browsing ? (
          <PostComposer
            role="COMPANY"
            onCreated={(status) => {
              setNotice(
                status === "DRAFT"
                  ? "Brouillon enregistré."
                  : "Publication enregistrée.",
              );
              setScope(status === "DRAFT" ? "DRAFT" : "PUBLISHED");
              void refresh().then(() => refreshCounts());
            }}
          />
        ) : null}

        <div className="sa-card flex gap-1 p-1">
          {SCOPES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setScope(item.value)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[12px] font-semibold sm:text-[13px]",
                  scope === item.value
                    ? "bg-[var(--sa-action-soft)] text-[var(--sa-action)]"
                    : "text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.8} />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="tabular-nums">{counts[item.value]}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <FeedCategoryChips value={category} onChange={setCategory} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sa-text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                browsing ? "Rechercher dans les posts de l’entreprise…" : "Rechercher dans mes posts…"
              }
              className="h-10 w-full rounded-[8px] border border-[var(--sa-border)] bg-[var(--sa-card)] pl-9 pr-3 text-sm outline-none focus:border-[var(--sa-action)]"
            />
          </div>
        </div>

        {company && !(company.isClaimed && company.isVerified) ? (
          <p className="sa-card px-4 py-3 text-[13px] text-[var(--sa-text-secondary)]">
            Compte non vérifié — vous pouvez enregistrer des brouillons. La publication sur le fil
            s’ouvre après vérification.
          </p>
        ) : null}

        {notice ? <p className="sa-card px-4 py-3 text-sm text-[var(--sa-action)]">{notice}</p> : null}
        {error ? <p className="text-sm text-[var(--sa-danger)]">{error}</p> : null}

        {isLoading ? (
          <PostListSkeleton />
        ) : (
          <PostList
            posts={posts}
            canManage={!browsing}
            emptyTitle={browsing ? "Aucun post pour cette entreprise" : "Aucun post ici"}
            emptyDescription={
              browsing
                ? "Cette entreprise n’a pas encore de publication visible."
                : "Commencez un post comme sur le fil — Photo, Document, Sondage ou Offre."
            }
            emptyAction={
              browsing ? (
                <button type="button" onClick={clearBrowseCompany} className="sa-btn-primary px-4 py-2">
                  Retour à mes posts
                </button>
              ) : (
                <Link
                  href="/company?compose=1"
                  className="sa-btn-primary inline-flex items-center gap-1.5 px-4 py-2"
                >
                  <PenLine className="size-4" />
                  Nouveau post
                </Link>
              )
            }
            onLike={(id, type) => guarded(() => like(id, type), "Réaction impossible.")}
            onBookmark={(id) => guarded(() => bookmark(id), "Favori impossible.")}
            onComment={(id, content, parentId) =>
              guarded(() => comment(id, content, parentId), "Commentaire impossible.")
            }
            onDelete={browsing ? undefined : setToDelete}
            onArchive={
              browsing
                ? undefined
                : (id) =>
                    void guarded(async () => {
                      await setStatus(id, "ARCHIVED");
                      await refreshCounts();
                    }, "Archivage impossible.")
            }
            onPublish={
              browsing
                ? undefined
                : (id) =>
                    void guarded(async () => {
                      await setStatus(id, "PUBLISHED");
                      await refreshCounts();
                    }, "Publication impossible. L'entreprise doit être revendiquée et vérifiée.")
            }
            onRestore={
              browsing
                ? undefined
                : (id) =>
                    void guarded(async () => {
                      await restore(id);
                      await refreshCounts();
                    }, "Restauration impossible.")
            }
          />
        )}
      </div>

      <FeedRightRail onCompany={openCompany} />

      <DeletePostDialog
        open={Boolean(toDelete)}
        title={toDelete?.title}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        onConfirm={() => {
          if (toDelete) {
            void guarded(async () => {
              await remove(toDelete.id);
              await refreshCounts();
            }, "Suppression impossible.");
          }
        }}
      />
    </div>
  );
}
