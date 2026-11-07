"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { RoleGate } from "@/components/auth/role-gate";
import { useAuth } from "@/hooks/use-auth";
import { usePosts } from "@/hooks/use-posts";
import type { ReportReason } from "@/types/post";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CandidateHero } from "@/components/candidate/candidate-hero";
import { CandidatePanel } from "@/components/candidate/candidate-panel";
import { EmptyState } from "@/components/layout/empty-state";
import { CandidatePostCard } from "@/components/candidate/candidate-post-card";
import { PostListSkeleton } from "@/components/posts/post-list";
import { ReportDialog } from "@/components/posts/report-dialog";

function SavedContent() {
  const { user, ready } = useAuth();
  const { posts, error, isLoading, like, bookmark, comment, report, refresh } =
    usePosts("bookmarks");
  const [notice, setNotice] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Connexion requise</h1>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour retrouver vos annonces enregistrées.
          </p>
          <Link href="/login?next=/saved" className={buttonVariants()}>
            Se connecter
          </Link>
        </CardContent>
      </Card>
    );
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
    <>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="lg:col-span-2">
      <CandidateHero
        title="Favoris"
        description="Les publications que vous avez gardées pour y revenir."
        actions={
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-medium text-blue-800 shadow-sm hover:bg-white/90"
          >
            Retour au fil
          </Link>
        }
      />
      </div>
      <div className="order-2 min-w-0 space-y-6 lg:order-1">
      {notice ? (
        <p className="rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
          {notice}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isLoading ? (
        <PostListSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-5" />}
          title="Aucun favori"
          description="Ouvrez un post et cliquez sur Favori. Il apparaîtra ici."
          action={
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Retour au fil
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <CandidatePostCard
              key={post.id}
              post={post}
              onLike={(id, type) => void guarded(() => like(id, type), "Réaction impossible.")}
              onBookmark={(id) => void guarded(() => bookmark(id), "Favori impossible.")}
              onComment={(id, content, parentId) =>
                void guarded(() => comment(id, content, parentId), "Commentaire impossible.")
              }
              onReport={(id) => setReportId(id)}
            />
          ))}
        </div>
      )}
      </div>
      <aside className="order-1 lg:sticky lg:top-20 lg:order-2">
        <CandidatePanel />
      </aside>
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

export default function SavedPage() {
  return (
    <RoleGate allow={["CANDIDATE", "COMPANY"]}>
      <SavedContent />
    </RoleGate>
  );
}
