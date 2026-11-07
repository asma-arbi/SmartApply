"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, EyeOff, Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { LinkedEntities } from "@/components/posts/linked-entities";
import { PostActions } from "@/components/posts/post-actions";
import { PostBody, PostExtras } from "@/components/posts/post-extras";
import { SourceBadge } from "@/components/posts/source-badge";
import { FollowButton } from "@/components/network/network-buttons";
import { CATEGORY_LABELS } from "@/lib/constants";
import { isPostFeatureEnabled } from "@/lib/feature-flags";
import { copyPostLink } from "@/lib/share";
import { RelativeTime } from "@/components/layout/relative-time";
import type { Post, ReactionType } from "@/types/post";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { PostImpressionTracker } from "@/components/analytics/post-impression-tracker";

function prettyName(raw: string) {
  const base = raw.includes("@") ? raw.split("@")[0]! : raw;
  return base
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const PERSON_COLORS = ["#2563eb", "#1d4ed8", "#3b82f6", "#1e40af", "#60a5fa", "#0ea5e9"];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 97;
  return PERSON_COLORS[hash % PERSON_COLORS.length];
}

export function CandidatePostCard({
  post,
  onLike,
  onBookmark,
  onComment,
  onTag,
  onReport,
  onHide,
  onDelete,
}: {
  post: Post;
  onLike: (id: string, type?: ReactionType) => void;
  onBookmark: (id: string) => void;
  onComment?: (id: string, content: string, parentId?: string) => void | Promise<void>;
  onTag?: (tag: string) => void;
  onReport?: (id: string) => void;
  onHide?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const router = useRouter();
  const [menuMessage, setMenuMessage] = useState("");
  const { user } = useAuth();
  // Company post = linked company catalog. Otherwise it's a candidate author.
  const isCompany = Boolean(post.companyId);
  const authorId = post.author?.id;
  const profileHref = isCompany
    ? `/entreprises/${encodeURIComponent(post.companyId!)}`
    : authorId
      ? `/candidats/${encodeURIComponent(authorId)}`
      : undefined;
  const displayName = prettyName(
    isCompany ? post.companyName || post.author.name : post.author.name,
  );
  const initials = isCompany ? initialsOf(displayName) : post.author.initials || initialsOf(displayName);
  const totalReactions =
    post.likes ||
    Object.values(post.reactions ?? {}).reduce((sum, value) => sum + value, 0);
  const personColor = colorFor(displayName);
  const isSelf = Boolean(user?.id && authorId && user.id === authorId);

  return (
    <article id={`post-${post.id}`} className="sa-card sa-animate-in overflow-hidden">
      <PostImpressionTracker postId={post.id} targetId={`post-${post.id}`} />
      <div className="px-4 pt-3.5 pb-2">
        <div className="flex items-start gap-2.5">
          {profileHref ? (
            <Link href={profileHref} className="shrink-0">
              <Avatar
                name={displayName}
                initials={initials}
                className="size-11 rounded-full text-[13px] font-bold text-white ring-2 ring-white"
                style={{ backgroundColor: isCompany ? "#2563eb" : personColor }}
              />
            </Link>
          ) : (
            <Avatar
              name={displayName}
              initials={initials}
              className="size-11 shrink-0 rounded-full text-[13px] font-bold text-white ring-2 ring-white"
              style={{ backgroundColor: isCompany ? "#2563eb" : personColor }}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      className="truncate text-[14px] font-semibold tracking-tight leading-5 text-[#2563eb] hover:underline"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <p className="truncate text-[14px] font-semibold tracking-tight leading-5 text-[#2563eb]">
                      {displayName}
                    </p>
                  )}
                  {isCompany && post.companyId && !isSelf ? (
                    <FollowButton type="company" id={post.companyId} compact />
                  ) : authorId && !isSelf ? (
                    <FollowButton type="candidate" id={authorId} compact />
                  ) : null}
                </div>
                <p className="mt-0.5 text-[12px] leading-[1.333] text-[var(--sa-text-secondary)]">
                  {CATEGORY_LABELS[post.category]}
                </p>
                <p className="text-[12px] text-[var(--sa-text-secondary)]">
                  <RelativeTime iso={post.createdAt} />
                  <span className="mx-1">·</span>
                  {post.repostOfId ? "Republication" : "🌐"}
                </p>
              </div>
              <DropdownMenu
                trigger={
                  <button
                    type="button"
                    aria-label="Plus d’options"
                    className="sa-btn-action -mr-1 -mt-1 inline-flex size-9 items-center justify-center"
                  >
                    <MoreHorizontal className="size-5" strokeWidth={1.9} />
                  </button>
                }
              >
                <DropdownMenuItem
                  description="Retrouvez-le dans Posts enregistrés"
                  onClick={() => void onBookmark(post.id)}
                >
                  {post.bookmarked ? "Retirer des enregistrés" : "Enregistrer"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  description="Copier le lien du post"
                  onClick={async () => {
                    try {
                      await copyPostLink(post);
                      setMenuMessage("Lien copié.");
                    } catch (error) {
                      setMenuMessage(error instanceof Error ? error.message : "Impossible de copier le lien.");
                    }
                  }}
                >
                  <Copy className="size-4" />
                  Copier le lien
                </DropdownMenuItem>
                {isPostFeatureEnabled("hide") && onHide ? (
                  <DropdownMenuItem
                    description="Voir moins de posts comme celui-ci"
                    onClick={() => onHide(post.id)}
                  >
                    <EyeOff className="size-4" />
                    Masquer ce post
                  </DropdownMenuItem>
                ) : null}
                {isSelf ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(`/posts/${post.id}/edit`)}>
                      <Pencil className="size-4" />
                      Modifier ma publication
                    </DropdownMenuItem>
                    {onDelete ? (
                      <DropdownMenuItem destructive onClick={() => onDelete(post.id)}>
                        <Trash2 className="size-4" />
                        Supprimer ma publication
                      </DropdownMenuItem>
                    ) : null}
                  </>
                ) : null}
                {!isSelf && onReport ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onClick={() => onReport(post.id)}>
                      <Flag className="size-4" />
                      Signaler ce post
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenu>
            </div>
          </div>
        </div>

        {post.origin === "imported" ? (
          <div className="mt-2">
            <SourceBadge post={post} />
          </div>
        ) : null}

        <Link href={`/posts/${post.id}`} className="mt-2 block">
          <PostBody post={post} />
        </Link>

        {post.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTag?.(tag)}
                className="text-[13px] font-semibold text-[#2563eb] hover:underline"
              >
                #{tag}
              </button>
            ))}
          </div>
        ) : null}

        <PostExtras post={post} />

        {menuMessage ? (
          <p role="status" className="mt-2 text-xs text-[var(--sa-text-secondary)]">{menuMessage}</p>
        ) : null}

        <LinkedEntities
          companyId={post.companyId}
          jobId={post.jobId}
          companyName={post.companyName}
          jobTitle={post.jobTitle}
        />
      </div>

      {(totalReactions > 0 || post.commentsCount > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-[12px] text-[var(--sa-text-secondary)]">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 hover:text-[#2563eb] hover:underline"
            onClick={() => onLike(post.id)}
          >
            {totalReactions > 0 ? (
              <>
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#2563eb] text-[9px] font-bold text-white">
                  👍
                </span>
                <span>{totalReactions}</span>
              </>
            ) : null}
          </button>
          {post.commentsCount > 0 ? (
            <button
              type="button"
              className="hover:text-[#2563eb] hover:underline"
              onClick={() => router.push(`/posts/${post.id}#comments`)}
            >
              {post.commentsCount} commentaire{post.commentsCount > 1 ? "s" : ""}
            </button>
          ) : null}
        </div>
      )}

      <div className="mx-2 border-t border-[var(--sa-divider)]">
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
      {menuMessage ? <p role="status" className="px-4 pb-2 text-xs text-[var(--sa-text-secondary)]">{menuMessage}</p> : null}
    </article>
  );
}
