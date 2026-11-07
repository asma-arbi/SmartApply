"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePosts } from "@/hooks/use-posts";
import { isUuid } from "@/lib/mappers";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { PostCategory } from "@/types/post";
import { PageIntro } from "@/components/layout/page-intro";
import { RelativeTime } from "@/components/layout/relative-time";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { PostFilters } from "@/components/posts/post-filters";
import { PostListSkeleton } from "@/components/posts/post-list";
import { SourceBadge } from "@/components/posts/source-badge";

type Scope = "PUBLISHED" | "REMOVED";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "PUBLISHED", label: "Publiés" },
  { value: "REMOVED", label: "Retirés" },
];

export function AdminPosts() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<PostCategory | "tous">("tous");
  const [tag, setTag] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [jobId, setJobId] = useState("");
  const [scope, setScope] = useState<Scope>("PUBLISHED");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { posts, error, isLoading } = usePosts(
    scope,
    {
      q: debouncedQuery,
      category,
      tag,
      companyId: isUuid(companyId) ? companyId : undefined,
      company: companyId && !isUuid(companyId) ? companyId : undefined,
      jobId: isUuid(jobId) ? jobId : undefined,
      job: jobId && !isUuid(jobId) ? jobId : undefined,
    },
    { mine: scope === "REMOVED" },
  );

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageIntro
        kicker="Espace admin"
        title="Publications"
        description="Recherchez, filtrez, puis ouvrez un post pour le dépublier ou le retirer."
      />

      <Tabs tabs={SCOPES} value={scope} onValueChange={setScope} variant="segmented" />
      <PostFilters
        query={query}
        onQuery={setQuery}
        companyId={companyId}
        onCompanyId={setCompanyId}
        jobId={jobId}
        onJobId={setJobId}
        tag={tag}
        onTag={setTag}
        category={category}
        onCategory={setCategory}
        searchPlaceholder="Titre, entreprise, offre ou tag…"
      />

      <p className="inline-flex rounded-full bg-card px-3 py-1 text-sm text-muted-foreground ring-1 ring-border">
        {isLoading
          ? "Chargement…"
          : `${posts.length} publication${posts.length > 1 ? "s" : ""}`}
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isLoading ? (
        <PostListSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="size-5" />}
          title="Aucune publication"
          description="Modifiez les filtres ou changez d’onglet."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className={`flex items-start justify-between gap-3 px-5 py-4 ${
                index > 0 ? "border-t border-border" : ""
              } hover:bg-violet-50/60 dark:hover:bg-muted/40`}
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {post.companyName ?? post.author.name} ·{" "}
                  <RelativeTime iso={post.createdAt} />
                </p>
                <h2 className="mt-1 truncate text-base font-semibold">{post.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="muted">{CATEGORY_LABELS[post.category]}</Badge>
                  <Badge variant={post.status === "PUBLISHED" ? "success" : "warning"}>
                    {STATUS_LABELS[post.status]}
                  </Badge>
                  <SourceBadge post={post} importedOnly />
                </div>
              </div>
              <Link
                href={`/posts/${post.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Modérer
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
