"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Copy, Mail, MessageCircle, Repeat2, Send, Share2, ThumbsUp } from "lucide-react";
import { REACTIONS } from "@/lib/constants";
import { RelativeTime } from "@/components/layout/relative-time";
import { repostPostAction } from "@/server/actions/posts.actions";
import { mapPost } from "@/lib/mappers";
import { listCommentsAction, toggleCommentLikeAction } from "@/server/actions/engagement.actions";
import { mapComment } from "@/lib/mappers";
import {
  copyPostLink,
  sharePost,
  sharePostByEmail,
  sharePostOnWhatsApp,
} from "@/lib/share";
import { stashNewPost } from "@/lib/repost-flash";
import { useAuth } from "@/hooks/use-auth";
import type { Comment, Post, ReactionType } from "@/types/post";
import { CommentReact } from "@/components/posts/comment-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PostActionsProps = {
  post: Post;
  showComposer?: boolean;
  onReact: (type: ReactionType) => void | Promise<void>;
  onBookmark?: () => void | Promise<void | { bookmarked: boolean }>;
  onComment?: (content: string, parentId?: string) => void | Promise<void>;
  onOpenComments?: () => void;
};

export function PostActions({
  post,
  showComposer = true,
  onReact,
  onComment,
  onOpenComments,
}: PostActionsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments ?? []);
  const [shareNote, setShareNote] = useState("");
  const [error, setError] = useState("");
  const [repostOpen, setRepostOpen] = useState(false);
  const [repostNote, setRepostNote] = useState(false);
  const [repostDraft, setRepostDraft] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const repostRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLDivElement>(null);
  const [mine, setMine] = useState<ReactionType | null>(post.liked ? post.reaction : null);
  const current = REACTIONS.find((item) => item.type === mine) ?? REACTIONS[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setMine(post.liked ? post.reaction : null), 0);
    return () => window.clearTimeout(timer);
  }, [post.id, post.liked, post.reaction]);

  async function loadComments() {
    setLoadingComments(true);
    try {
      const result = await listCommentsAction(post.id, 1, 100);
      setComments(result.items.map((item) => mapComment(item as unknown as import("@/types/post").ApiComment, user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les commentaires.");
    } finally {
      setLoadingComments(false);
    }
  }

  useEffect(() => {
    if (!picker && !repostOpen && !sendOpen && !repostNote) return;
    function onPointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      if (picker && pickerRef.current && !pickerRef.current.contains(target)) {
        setPicker(false);
      }
      if (repostOpen && repostRef.current && !repostRef.current.contains(target)) {
        setRepostOpen(false);
      }
      if (sendOpen && sendRef.current && !sendRef.current.contains(target)) {
        setSendOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [picker, repostOpen, sendOpen, repostNote]);

  function flash(note: string) {
    setShareNote(note);
    window.setTimeout(() => setShareNote(""), 2800);
  }

  function goLogin() {
    router.push(`/login?next=${encodeURIComponent(pathname || "/")}`);
  }

  function requireUser() {
    if (user) return true;
    goLogin();
    return false;
  }

  async function handleComment() {
    if (post.commentMode === "NONE") {
      setError("Les commentaires sont désactivés sur cette publication.");
      return;
    }
    if (!requireUser()) return;
    if (onOpenComments && !onComment) {
      onOpenComments();
      return;
    }
    setPicker(false);
    setRepostOpen(false);
    setSendOpen(false);
    const next = !open;
    setOpen(next);
    setError("");
    if (next) void loadComments();
  }

  async function submitComment() {
    if (!draft.trim()) return;
    if (!requireUser()) return;
    if (!onComment) {
      onOpenComments?.();
      return;
    }
    setBusy(true);
    try {
      await onComment(draft.trim());
      setDraft("");
      setError("");
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commentaire impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseReaction(type: ReactionType) {
    if (!requireUser()) return;
    const previous = mine;
    setMine(previous === type ? null : type);
    setPicker(false);
    setError("");
    try {
      await onReact(type);
    } catch (err) {
      setMine(previous);
      setError(err instanceof Error ? err.message : "Réaction impossible.");
    }
  }

  async function quickLike() {
    if (!requireUser()) return;
    setPicker(false);
    setError("");
    const previous = mine;
    const next = previous === "LIKE" ? null : "LIKE";
    setMine(next);
    try {
      await onReact("LIKE");
    } catch (err) {
      setMine(previous);
      setError(err instanceof Error ? err.message : "Réaction impossible.");
    }
  }

  async function doRepost(commentary?: string) {
    if (!requireUser()) return;
    setBusy(true);
    setError("");
    try {
      const result = await repostPostAction(post.id, commentary);
      const created = mapPost(result.data as unknown as import("@/types/post").ApiPost, user);
      stashNewPost(created);
      setRepostOpen(false);
      setRepostNote(false);
      setRepostDraft("");
      window.dispatchEvent(new Event("smartapply:posts-changed"));
      // Hard navigation so the new post is always visible (avoids stale client feed).
      const dest =
        user!.role === "COMPANY"
          ? "/company?reposted=1"
          : user!.role === "ADMIN"
            ? "/admin/posts"
            : "/?reposted=1";
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Republication impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNativeShare() {
    setSendOpen(false);
    try {
      const result = await sharePost(post);
      flash(result === "copied" ? "Lien copié" : "Post partagé");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partage impossible.");
    }
  }

  async function handleCopyLink() {
    setSendOpen(false);
    try {
      await copyPostLink(post);
      flash("Lien copié");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copie impossible.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        <div ref={pickerRef} className="relative">
          {picker ? (
            <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--sa-border)] bg-[var(--sa-card)] px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              {REACTIONS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  title={item.label}
                  className={cn(
                    "rounded-full px-1.5 text-lg leading-none transition-transform hover:-translate-y-1",
                    mine === item.type && "scale-125",
                  )}
                  onClick={() => void chooseReaction(item.type)}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          ) : null}
          <ActionButton
            active={Boolean(mine)}
            className={mine ? current.className : undefined}
            onClick={() => void quickLike()}
            onContextMenu={(event) => {
              event.preventDefault();
              if (!requireUser()) return;
              setSendOpen(false);
              setRepostOpen(false);
              setPicker((value) => !value);
            }}
            title="Clic : j’aime · Clic droit : autres réactions"
          >
            {mine ? (
              <span className="text-[15px] leading-none">{current.emoji}</span>
            ) : (
              <ThumbsUp className="size-[18px]" strokeWidth={1.8} />
            )}
            <span className="truncate">{mine ? current.label : "J’aime"}</span>
          </ActionButton>
          <button
            type="button"
            className="absolute -top-1 right-0 rounded-full px-1 text-[10px] font-bold text-[var(--sa-text-muted)] hover:bg-[var(--sa-hover)] hover:text-[var(--sa-text)]"
            aria-label="Autres réactions"
            onClick={(event) => {
              event.stopPropagation();
              if (!requireUser()) return;
              setSendOpen(false);
              setRepostOpen(false);
              setPicker((value) => !value);
            }}
          >
            ▾
          </button>
        </div>

        <ActionButton active={open} onClick={() => void handleComment()}>
          <MessageCircle className="size-[18px]" strokeWidth={1.8} />
          <span className="truncate">Commenter</span>
        </ActionButton>

        <div ref={repostRef} className="relative">
          {repostOpen ? (
            <div className="absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-[280px] -translate-x-1/2 rounded-[8px] border border-[var(--sa-border)] bg-[var(--sa-card)] p-1 shadow-[0_8px_28px_rgba(0,0,0,0.16)]">
              <button
                type="button"
                disabled={busy}
                className="flex w-full flex-col items-start rounded-[6px] px-3 py-2.5 text-left hover:bg-[var(--sa-hover)] disabled:opacity-60"
                onClick={() => void doRepost()}
              >
                <span className="text-sm font-semibold text-[var(--sa-text)]">Republier tel quel</span>
                <span className="text-[12px] text-[var(--sa-text-muted)]">
                  Partagez ce post avec votre réseau
                </span>
              </button>
              <button
                type="button"
                className="flex w-full flex-col items-start rounded-[6px] px-3 py-2.5 text-left hover:bg-[var(--sa-hover)]"
                onClick={() => {
                  if (!requireUser()) return;
                  setRepostOpen(false);
                  setRepostNote(true);
                  setRepostDraft("");
                }}
              >
                <span className="text-sm font-semibold text-[var(--sa-text)]">
                  Republier avec votre avis
                </span>
                <span className="text-[12px] text-[var(--sa-text-muted)]">
                  Ajoutez un commentaire à l&apos;original
                </span>
              </button>
            </div>
          ) : null}
          <ActionButton
            onClick={() => {
              if (!requireUser()) return;
              setSendOpen(false);
              setPicker(false);
              setRepostNote(false);
              setRepostOpen((value) => !value);
            }}
          >
            <Repeat2 className="size-[18px]" strokeWidth={1.8} />
            <span className="truncate">Republier</span>
            {post.reposts > 0 ? <span className="tabular-nums">{post.reposts}</span> : null}
          </ActionButton>
        </div>

        <div ref={sendRef} className="relative">
          {sendOpen ? (
            <div className="absolute bottom-[calc(100%+6px)] right-0 z-20 w-[270px] rounded-[8px] border border-[var(--sa-border)] bg-[var(--sa-card)] p-1 shadow-[0_8px_28px_rgba(0,0,0,0.16)] sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2.5 text-left hover:bg-[var(--sa-hover)]"
                onClick={() => void handleNativeShare()}
              >
                <Share2 className="size-4 shrink-0 text-[var(--sa-action)]" />
                <span className="text-sm font-semibold">Partager…</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2.5 text-left hover:bg-[var(--sa-hover)]"
                onClick={() => void handleCopyLink()}
              >
                <Copy className="size-4 shrink-0 text-[var(--sa-action)]" />
                <span className="text-sm font-semibold">Copier le lien</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2.5 text-left hover:bg-[var(--sa-hover)]"
                onClick={() => {
                  setSendOpen(false);
                  sharePostByEmail(post);
                  flash("Ouverture de l’e-mail…");
                }}
              >
                <Mail className="size-4 shrink-0 text-[var(--sa-action)]" />
                <span className="text-sm font-semibold">Envoyer par e-mail</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2.5 text-left hover:bg-[var(--sa-hover)]"
                onClick={() => {
                  setSendOpen(false);
                  sharePostOnWhatsApp(post);
                  flash("Ouverture de WhatsApp…");
                }}
              >
                <Send className="size-4 shrink-0 text-[var(--sa-action)]" />
                <span className="text-sm font-semibold">Envoyer sur WhatsApp</span>
              </button>
            </div>
          ) : null}
          <ActionButton
            onClick={() => {
              setRepostOpen(false);
              setPicker(false);
              setSendOpen((value) => !value);
            }}
          >
            <Send className="size-[18px]" strokeWidth={1.8} />
            <span className="truncate">Envoyer</span>
          </ActionButton>
        </div>
      </div>

      {repostNote ? (
        <div className="space-y-2 rounded-[12px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
          <p className="text-[13px] font-semibold text-[var(--sa-text)]">Votre avis sur ce post</p>
          <Link
            href={`/posts/${post.id}`}
            className="block rounded-[10px] border border-[var(--sa-border)] bg-[var(--sa-card)] p-3 hover:border-[var(--sa-action)]"
          >
            <div className="flex items-center gap-2">
              <Avatar
                name={post.companyName ?? post.author.name}
                initials={post.author.initials}
                className="size-8 text-[11px]"
              />
              <span className="truncate text-[13px] font-semibold text-[var(--sa-text)]">
                {post.companyName ?? post.author.name}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-[var(--sa-text)]">
              {post.title}
            </p>
            <p className="mt-1 line-clamp-3 text-[12px] text-[var(--sa-text-secondary)]">
              {post.excerpt || post.content}
            </p>
          </Link>
          <textarea
            value={repostDraft}
            onChange={(event) => setRepostDraft(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Ajoutez un commentaire avant de republier…"
            className="w-full resize-none rounded-[10px] border border-[var(--sa-border)] bg-[var(--sa-card)] px-3 py-2 text-sm outline-none focus:border-[var(--sa-action)]"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRepostNote(false);
                setRepostDraft("");
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy || !repostDraft.trim()}
              onClick={() => void doRepost(repostDraft.trim())}
            >
              {busy ? "…" : "Republier"}
            </Button>
          </div>
        </div>
      ) : null}

      {shareNote ? (
        <div className="flex items-center justify-between rounded-md bg-[#191919] px-3 py-2 text-sm text-white">
          <span>{shareNote}</span>
          <button type="button" className="font-semibold" onClick={() => setShareNote("")}>
            Fermer
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive">
          {error}{" "}
          {!user ? (
            <a href="/login" className="font-medium underline">
              Connexion
            </a>
          ) : null}
        </p>
      ) : null}

      {showComposer && open ? (
        <div className="space-y-3 rounded-[var(--sa-radius-card)] bg-[var(--sa-surface-soft)] p-3">
          <p className="text-[var(--sa-fs-meta)] font-semibold text-[var(--sa-text-secondary)]">
            {loadingComments
              ? "Chargement…"
              : `${comments.length} commentaire${comments.length > 1 ? "s" : ""}`}
          </p>
          {comments.length > 0 ? (
            <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  canInteract={Boolean(user && onComment)}
                  onReply={
                    onComment
                      ? async (content, parentId) => {
                          await onComment(content, parentId);
                          await loadComments();
                        }
                      : undefined
                  }
                  onReact={async (commentId, type) => {
      const result = await toggleCommentLikeAction(commentId, type);
                    setComments((current) => patchCommentReaction(current, commentId, result));
                  }}
                />
              ))}
            </ul>
          ) : !loadingComments ? (
            <p className="text-sm text-muted-foreground">Aucun commentaire pour le moment.</p>
          ) : null}

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submitComment();
            }}
          >
            <Avatar
              name={user?.email ?? "Vous"}
              initials={(user?.email ?? "VO").slice(0, 2).toUpperCase()}
              className="size-10"
            />
            <Input
              value={draft}
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ajouter un commentaire..."
              className="h-10 flex-1 rounded-full border-[var(--sa-border)] bg-[var(--sa-card)]"
            />
            <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
              {busy ? "…" : "Envoyer"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  onContextMenu,
  active,
  className,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  onContextMenu?: React.MouseEventHandler<HTMLButtonElement>;
  active?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-[4px] px-1 text-[14px] font-semibold text-[var(--sa-text-secondary)] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[var(--sa-text)]",
        active && "text-[#2563eb]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function patchCommentReaction(
  comments: Comment[],
  commentId: string,
  result: {
    liked: boolean;
    likes: number;
    reaction: ReactionType | null;
    reactions: Record<ReactionType, number>;
  },
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return {
        ...comment,
        liked: result.liked,
        likes: result.likes,
        reaction: result.reaction,
        reactions: result.reactions,
      };
    }
    return {
      ...comment,
      replies: comment.replies
        ? patchCommentReaction(comment.replies, commentId, result)
        : comment.replies,
    };
  });
}

function CommentRow({
  comment,
  nested = false,
  canInteract,
  onReply,
  onReact,
}: {
  comment: Comment;
  nested?: boolean;
  canInteract: boolean;
  onReply?: (content: string, parentId: string) => void | Promise<void>;
  onReact?: (commentId: string, type: ReactionType) => void | Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendReply() {
    if (!draft.trim() || !onReply) return;
    setBusy(true);
    try {
      await onReply(draft.trim(), comment.parentId ?? comment.id);
      setDraft("");
      setReplying(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réponse impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={nested ? "ml-8" : undefined}>
      <div className="flex gap-2.5">
        <Avatar
          name={comment.author.name}
          initials={comment.author.initials}
          className="size-10 text-[11px]"
        />
        <div className="min-w-0 flex-1">
          <div className="rounded-[var(--sa-radius-card)] bg-[var(--sa-card)] px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[13px] font-semibold text-[var(--sa-text)]">{comment.author.name}</p>
              <p className="shrink-0 text-[11px] text-[var(--sa-text-muted)]">
                <RelativeTime iso={comment.createdAt} />
              </p>
            </div>
            <p className="mt-0.5 text-sm leading-6 text-[var(--sa-text)]">{comment.content}</p>
          </div>
          {!comment.deleted ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-0.5">
              <CommentReact
                liked={comment.liked}
                reaction={comment.reaction}
                likes={comment.likes}
                disabled={!canInteract || !onReact}
                onReact={(type) => onReact?.(comment.id, type)}
              />
              {canInteract && onReply ? (
                <button
                  type="button"
                  className="rounded-md px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setReplying((value) => !value)}
                >
                  Répondre
                </button>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
          {replying ? (
            <form
              className="mt-1.5 flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendReply();
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Votre réponse…"
                className="h-8 bg-card text-sm"
              />
              <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
                {busy ? "…" : "Envoyer"}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              nested
              canInteract={canInteract}
              onReply={onReply}
              onReact={onReact}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
