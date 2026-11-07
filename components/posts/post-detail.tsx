"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Flag,
  Pencil,
  RotateCcw,
  Send,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { PostActions } from "@/components/posts/post-actions";
import { JobDetailsSummary, PostContent, PostExtras } from "@/components/posts/post-extras";
import { CATEGORY_LABELS, LANGUAGE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { canManagePosts, homeForRole, isAdminRole } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { usePost } from "@/hooks/use-posts";
import type { ModerateAction, ReportReason } from "@/types/post";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentSection } from "@/components/posts/comment-section";
import { DeletePostDialog } from "@/components/posts/delete-post-dialog";
import { LinkedEntities } from "@/components/posts/linked-entities";
import { ReportDialog } from "@/components/posts/report-dialog";
import { SourceBadge } from "@/components/posts/source-badge";
import { PostImpressionTracker } from "@/components/analytics/post-impression-tracker";

export function PostDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    post,
    isLoading,
    error,
    like,
    bookmark,
    remove,
    setStatus,
    moderate,
    comment,
    editComment,
    deleteComment,
    reactComment,
    report,
  } = usePost(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const isCompanySpace = canManagePosts(user?.role);
  const isAdmin = isAdminRole(user?.role);
  const home = homeForRole(user?.role);

  async function guarded<T>(action: () => Promise<T>, fallback: string) {
    if (!user) {
      setNotice("Connectez-vous pour liker, commenter ou enregistrer.");
      throw new Error("Connectez-vous pour réagir.");
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

  async function runModerate(action: ModerateAction) {
    try {
      await moderate(action, `Action ${action} depuis SmartApply`);
      setNotice("Modération enregistrée.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Modération impossible.");
    }
  }

  if (isLoading) return <PostDetailFallback />;

  if (!post) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Publication introuvable</h1>
          <p className="text-sm text-muted-foreground">
            {error || "Ce post n'existe plus."}
          </p>
          <Link href={home} className={buttonVariants()}>
            Retour
          </Link>
        </CardContent>
      </Card>
    );
  }

  const canManage = Boolean(
    user && (user.role === "ADMIN" || post.author.id === user.id ||
      (user.role === "COMPANY" && post.companyId === user.id)),
  );

  return (
    <article id={`post-detail-${post.id}`} className="mx-auto max-w-3xl space-y-5">
      <PostImpressionTracker postId={post.id} targetId={`post-detail-${post.id}`} />
      <Link
        href={home}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {isAdmin ? "Modération" : isCompanySpace ? "Mes posts" : "Fil"}
      </Link>

      <div className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="space-y-5 p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{CATEGORY_LABELS[post.category]}</Badge>
            {post.status !== "PUBLISHED" ? (
              <Badge
                variant={
                  post.status === "DRAFT"
                    ? "warning"
                    : post.status === "ARCHIVED"
                      ? "muted"
                      : "danger"
                }
              >
                {STATUS_LABELS[post.status]}
              </Badge>
            ) : null}
            <Badge variant="outline">{LANGUAGE_LABELS[post.language]}</Badge>
            {post.origin === "imported" ? <SourceBadge post={post} /> : null}
          </div>

          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-3xl">
            {post.title}
          </h1>

          <div className="flex items-center gap-3">
            <Avatar
              name={post.companyName ?? post.author.name}
              initials={post.author.initials}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {post.companyName ?? post.author.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(post.createdAt)}
              </p>
            </div>
          </div>

          <LinkedEntities
            companyId={post.companyId}
            jobId={post.jobId}
            companyName={post.companyName}
            jobTitle={post.jobTitle}
            hrefBase={isCompanySpace ? "/company" : "/"}
          />

          <div className="border-t border-border pt-5 text-foreground">
            <PostContent content={post.content} />
          </div>
          <JobDetailsSummary post={post} />
          <PostExtras post={post} />

          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((item) =>
                isAdmin ? (
                  <Badge key={item} variant="muted">
                    #{item}
                  </Badge>
                ) : (
                  <Link
                    key={item}
                    href={`${canManage ? "/company" : "/"}?tag=${encodeURIComponent(item)}`}
                  >
                    <Badge variant="muted">#{item}</Badge>
                  </Link>
                ),
              )}
            </div>
          ) : null}
        </div>

        <div className="border-t border-border px-5 py-3 sm:px-8">
          <PostActions
            post={post}
            onReact={(type) => guarded(() => like(type), "Réaction impossible.")}
            onBookmark={() => guarded(() => bookmark(), "Favori impossible.")}
            onComment={(content, parentId) =>
              guarded(() => comment(content, parentId), "Commentaire impossible.")
            }
            onOpenComments={() => {
              document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
          {!isAdmin && !isCompanySpace ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => {
                if (!user) {
                  setNotice("Connectez-vous pour signaler un post.");
                  return;
                }
                setReportOpen(true);
              }}
            >
              <Flag />
              Signaler
            </Button>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-border dark:bg-muted/30 sm:px-8">
            <p className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-muted-foreground">
              Gestion
            </p>
            <Link
              href={`/posts/${post.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil />
              Modifier
            </Link>
            {post.status !== "PUBLISHED" ? (
              <Button
                size="sm"
                onClick={() =>
                  void guarded(
                    () => setStatus("PUBLISHED"),
                    "Publication impossible. L'entreprise doit être revendiquée et vérifiée.",
                  )
                }
              >
                <Send />
                Publier
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void guarded(() => setStatus("ARCHIVED"), "Archivage impossible.")}
              >
                <Archive />
                Archiver
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
              Supprimer
            </Button>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="flex flex-wrap gap-2 border-t border-violet-100 bg-violet-50/80 px-5 py-3 dark:border-border dark:bg-muted/30 sm:px-8">
            <p className="mr-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
              <ShieldAlert className="size-3.5" />
              Modération
            </p>
            {post.status === "PUBLISHED" ? (
              <Button size="sm" variant="outline" onClick={() => void runModerate("UNPUBLISH")}>
                Dépublier
              </Button>
            ) : null}
            {post.status !== "REMOVED" ? (
              <Button size="sm" variant="destructive" onClick={() => void runModerate("REMOVE")}>
                Retirer
              </Button>
            ) : (
              <Button size="sm" onClick={() => void runModerate("RESTORE")}>
                <RotateCcw />
                Restaurer
              </Button>
            )}
          </div>
        ) : null}

        {notice ? (
          <p className="border-t border-border px-5 py-3 text-sm text-primary sm:px-8">
            {notice}{" "}
            {!user ? (
              <Link href="/login" className="font-medium underline">
                Connexion
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>

      <CommentSection
        comments={post.comments}
        user={user}
        postAuthorId={post.author.id}
        onAdd={(content, parentId) =>
          guarded(() => comment(content, parentId), "Commentaire impossible.")
        }
        onEdit={(commentId, content) =>
          guarded(() => editComment(commentId, content), "Modification impossible.")
        }
        onDelete={(commentId) => guarded(() => deleteComment(commentId), "Suppression impossible.")}
        onReact={(commentId, type) =>
          guarded(() => reactComment(commentId, type), "Réaction impossible.")
        }
      />

      <DeletePostDialog
        open={confirmDelete}
        title={post.title}
        onOpenChange={setConfirmDelete}
        onConfirm={() => {
          void remove().then(() => router.push(home));
        }}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        onSubmit={(reason: ReportReason, details: string) => {
          void report(reason, details)
            .then(() => setNotice("Signalement enregistré."))
            .catch((err: unknown) =>
              setNotice(err instanceof Error ? err.message : "Signalement impossible."),
            );
        }}
      />
    </article>
  );
}

export function PostDetailFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
