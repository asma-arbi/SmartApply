"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePost } from "@/hooks/use-posts";
import { canCreatePosts, homeForRole } from "@/lib/roles";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PostForm } from "@/components/posts/post-form";

export function EditPost({ id }: { id: string }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { post, isLoading, error, edit } = usePost(id);
  const allowed = canCreatePosts(user?.role);
  const isOwner =
    Boolean(user && post && (post.author.id === user.id || user.role === "ADMIN"));

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?next=/posts/${id}/edit`);
      return;
    }
    if (!allowed) router.replace(homeForRole(user.role));
  }, [allowed, id, ready, router, user]);

  useEffect(() => {
    if (!ready || !user || isLoading || !post) return;
    if (!isOwner && user.role !== "ADMIN") {
      router.replace(homeForRole(user.role));
    }
  }, [isLoading, isOwner, post, ready, router, user]);

  if (!ready || !allowed) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Publication introuvable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link href={homeForRole(user?.role)} className={buttonVariants()}>
            Retour
          </Link>
        </CardContent>
      </Card>
    );
  }

  const home = homeForRole(user?.role);

  return (
    <div className="sa-feed-shell mx-auto max-w-[var(--sa-composer-max)] space-y-4 px-3 py-5 sm:px-4 pb-16">
      <Link
        href={home}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--sa-text-secondary)] transition-colors hover:text-[var(--sa-action)]"
      >
        <ArrowLeft className="size-4" strokeWidth={1.9} />
        Retour au fil
      </Link>

      <header className="sa-card space-y-1 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sa-action)]">
          {user?.role === "CANDIDATE" ? "Espace candidat" : "Espace entreprise"}
        </p>
        <h1
          className="text-[22px] font-bold tracking-tight text-[var(--sa-text)]"
          style={{ fontFamily: "var(--sa-font-display)" }}
        >
          Modifier le post
        </h1>
        <p className="text-[13px] leading-6 text-[var(--sa-text-secondary)]">
          Modifiez votre publication et retrouvez-la sur le fil.
        </p>
      </header>

      <PostForm
        initial={{
          title: post.title,
          content: post.content,
          category: post.category,
          tags: post.tags,
          language: post.language,
          companyId: post.companyId,
          jobId: post.jobId,
          origin: post.origin,
          sourceUrl: post.sourceUrl,
          sourceLabel: post.sourceLabel,
          coverImageUrl: post.coverImageUrl,
          status: post.status,
          postKind: post.postKind,
          jobDetails: post.jobDetails ?? undefined,
        }}
        onCancel={() => router.push(home)}
        onSubmit={async (input) => {
          await edit(input);
          router.push(`/posts/${post.id}`);
        }}
      />
    </div>
  );
}

