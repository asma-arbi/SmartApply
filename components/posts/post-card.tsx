"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { JobDetailsSummary, PostBody, PostExtras } from "@/components/posts/post-extras";
import { LinkedEntities } from "@/components/posts/linked-entities";
import { PostActions } from "@/components/posts/post-actions";
import { SourceBadge } from "@/components/posts/source-badge";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { RelativeTime } from "@/components/layout/relative-time";
import type { Post, ReactionType } from "@/types/post";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PostImpressionTracker } from "@/components/analytics/post-impression-tracker";

type PostCardProps = {
  post: Post;
  canManage?: boolean;
  compact?: boolean;
  onLike: (id: string, type?: ReactionType) => void;
  onBookmark: (id: string) => void;
  onComment?: (id: string, content: string, parentId?: string) => void | Promise<void>;
  onTag?: (tag: string) => void;
  onDelete?: (post: Post) => void;
  onArchive?: (id: string) => void;
  onPublish?: (id: string) => void;
  onRestore?: (id: string) => void;
};

const CATEGORY_TONE: Partial<Record<Post["category"], string>> = {
  CAREER_ADVICE: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  RECRUITMENT_NEWS: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  INTERNSHIP_ANNOUNCEMENT:
    "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  COMPANY_ANNOUNCEMENT:
    "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};
const DEFAULT_CATEGORY_TONE =
  "bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";

function statusVariant(status: Post["status"]) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "DRAFT") return "warning" as const;
  return "muted" as const;
}

export function PostCard({
  post,
  canManage,
  compact,
  onLike,
  onBookmark,
  onComment,
  onTag,
  onDelete,
  onArchive,
  onPublish,
  onRestore,
}: PostCardProps) {
  const router = useRouter();
  const displayAuthorName = post.companyName ?? post.author.name;
  const displayAuthorInitials = post.companyName
    ? post.companyName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : post.author.initials;
  const totalReactions = post.likes || Object.values(post.reactions ?? {}).reduce((sum, count) => sum + count, 0);

  return (
    <article id={`post-${post.id}`} className="sa-card">
      <PostImpressionTracker postId={post.id} targetId={`post-${post.id}`} />
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <Avatar
            name={displayAuthorName}
            initials={displayAuthorInitials}
            className="size-12 text-sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--sa-text)]">
                  {displayAuthorName}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[var(--sa-fs-meta)] text-[var(--sa-text-secondary)]">
                  <RelativeTime iso={post.createdAt} />
                  <span aria-hidden>·</span>
                  {post.repostOfId ? (
                    <span className="rounded-full bg-[var(--sa-action-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--sa-action)]">
                      Republication
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        CATEGORY_TONE[post.category] ?? DEFAULT_CATEGORY_TONE,
                      )}
                    >
                      {CATEGORY_LABELS[post.category]}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {canManage || post.status !== "PUBLISHED" ? (
                  <Badge variant={statusVariant(post.status)}>
                    {STATUS_LABELS[post.status]}
                  </Badge>
                ) : null}
                {canManage ? (
                  <DropdownMenu
                    trigger={
                      <button
                        type="button"
                        aria-label="Actions"
                        className="sa-btn-action inline-flex size-8 items-center justify-center"
                      >
                        <MoreHorizontal className="size-5" strokeWidth={1.8} />
                      </button>
                    }
                  >
                    <DropdownMenuItem onClick={() => router.push(`/posts/${post.id}/edit`)}>
                      <Pencil />
                      Modifier le post
                    </DropdownMenuItem>
                    {onDelete ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => onDelete(post)}>
                          <Trash2 />
                          Supprimer le post
                        </DropdownMenuItem>
                      </>
                    ) : null}
                    <DropdownMenuItem
                      description="Visible en premier sur votre page"
                      onClick={() => {
                        void import("@/lib/posts-api").then(({ pinPostApi }) =>
                          pinPostApi(post.id, true).then(() => router.refresh()),
                        );
                      }}
                    >
                      Épingler en haut
                    </DropdownMenuItem>
                    <DropdownMenuItem description="Tout le monde">
                      Qui peut voir ce post
                    </DropdownMenuItem>
                    <DropdownMenuItem>Désactiver les commentaires</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/posts/${post.id}`)}>
                      Copier le lien
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {post.status === "REMOVED" && onRestore ? (
                      <DropdownMenuItem onClick={() => onRestore(post.id)}>
                        <RotateCcw />
                        Restaurer
                      </DropdownMenuItem>
                    ) : post.status !== "PUBLISHED" ? (
                      <DropdownMenuItem onClick={() => onPublish?.(post.id)}>
                        <Send />
                        Publier
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        description="Le post n’est plus visible, restaurable"
                        onClick={() => onArchive?.(post.id)}
                      >
                        <Archive />
                        Archiver
                      </DropdownMenuItem>
                    )}
                  </DropdownMenu>
                ) : null}
              </div>
            </div>

            <Link href={`/posts/${post.id}`} className="mt-2 block hover:text-[var(--sa-action)]">
              <PostBody post={post} />
            </Link>
            <JobDetailsSummary post={post} />
            <PostExtras post={post} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {post.origin === "imported" ? <SourceBadge post={post} /> : null}
              <LinkedEntities
                companyId={post.companyId}
                jobId={post.jobId}
                companyName={post.companyName}
                jobTitle={post.jobTitle}
                hrefBase="/company"
              />
            </div>

            {post.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTag?.(tag)}
                    className="rounded-full px-2 py-0.5 text-[var(--sa-fs-meta)] font-semibold text-[var(--sa-action)] hover:bg-[var(--sa-action-soft)] hover:underline"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {(totalReactions > 0 || post.commentsCount > 0) ? (
          <div className="mt-3 flex items-center justify-between px-1 py-1 text-[12px] text-[var(--sa-text-secondary)]">
            {totalReactions > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 hover:text-[var(--sa-action)] hover:underline"
                onClick={() => onLike(post.id)}
                aria-label={`${totalReactions} réactions`}
              >
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-[var(--sa-action)] text-[9px] text-white">👍</span>
                <span>{totalReactions}</span>
              </button>
            ) : <span />}
            {post.commentsCount > 0 ? (
              <button
                type="button"
                className="hover:text-[var(--sa-action)] hover:underline"
                onClick={() => router.push(`/posts/${post.id}#comments`)}
              >
                {post.commentsCount} commentaire{post.commentsCount > 1 ? "s" : ""}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-2 border-t border-[var(--sa-divider)] pt-1">
          <PostActions
            post={post}
            onReact={(type) => onLike(post.id, type)}
            onBookmark={() => onBookmark(post.id)}
            onComment={
              onComment ? (content, parentId) => onComment(post.id, content, parentId) : undefined
            }
            onOpenComments={() => router.push(`/posts/${post.id}#comments`)}
          />
        </div>
      </div>
    </article>
  );
}
