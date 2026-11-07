"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth-storage";
import { RelativeTime } from "@/components/layout/relative-time";
import type { AuthUser, Comment, ReactionType } from "@/types/post";
import { CommentReact } from "@/components/posts/comment-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentSectionProps = {
  comments: Comment[];
  user: AuthUser | null;
  postAuthorId?: string;
  onAdd: (content: string, parentId?: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReact: (commentId: string, type: ReactionType) => Promise<void>;
};

export function CommentSection({
  comments,
  user,
  postAuthorId,
  onAdd,
  onEdit,
  onDelete,
  onReact,
}: CommentSectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    if (!user || !getStoredToken()) {
      router.push(loginHref);
      return;
    }
    setSending(true);
    try {
      await onAdd(content);
      setContent("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commentaire impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      id="comments"
      className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6"
    >
      <h2 className="text-base font-semibold tracking-tight">
        Commentaires
        <span className="ml-1.5 font-normal text-muted-foreground">
          ({countComments(comments)})
        </span>
      </h2>

      <form onSubmit={handleSubmit} className="mt-5 flex gap-3 rounded-xl bg-muted/50 p-3">
        {user ? (
          <Avatar
            name={user.name?.trim() || "Mon profil candidat"}
            initials={(user.name?.trim() || "C").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            className="mt-0.5 size-9"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-3">
        <Textarea
          value={content}
          maxLength={2000}
          onChange={(event) => setContent(event.target.value)}
          placeholder={user ? "Réagir au post, poser une question…" : "Connectez-vous pour commenter…"}
          className="min-h-[88px] bg-card"
        />
        {error ? (
          <p className="text-sm text-destructive">
            {error}{" "}
            <Link href={loginHref} className="font-medium underline">
              Connexion
            </Link>
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">{content.trim().length}/2000</p>
          <Button type="submit" size="sm" disabled={!content.trim() || sending}>
            {sending ? "Envoi…" : "Commenter"}
          </Button>
        </div>
        </div>
      </form>

      {comments.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              user={user}
              postAuthorId={postAuthorId}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Soyez le premier à commenter.
        </p>
      )}
    </section>
  );
}

function countComments(comments: Comment[]) {
  return comments.reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0);
}

function CommentItem({
  comment,
  user,
  postAuthorId,
  onAdd,
  onEdit,
  onDelete,
  onReact,
  nested = false,
}: {
  comment: Comment;
  user: AuthUser | null;
  postAuthorId?: string;
  onAdd: (content: string, parentId?: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReact: (commentId: string, type: ReactionType) => Promise<void>;
  nested?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canEdit = Boolean(user && comment.author.id === user.id && !comment.deleted);
  const canDelete = Boolean(
    user &&
      !comment.deleted &&
      (comment.author.id === user.id || user.role === "ADMIN" || user.id === postAuthorId),
  );

  async function saveEdit() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await onEdit(comment.id, draft);
      setEditing(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await onAdd(reply, comment.parentId ?? comment.id);
      setReply("");
      setReplying(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réponse impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={nested ? "ml-6 border-l border-border pl-4 sm:ml-8" : ""}>
      <div className="flex gap-3">
        <Avatar
          name={comment.author.name}
          initials={comment.author.initials}
          className={nested ? "size-8" : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-muted/70 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{comment.author.name}</p>
              <p className="shrink-0 text-xs text-muted-foreground">
                <RelativeTime iso={comment.createdAt} />
              </p>
            </div>
            {editing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-16"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                    Annuler
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => void saveEdit()}>
                    Enregistrer
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm leading-6">{comment.content}</p>
            )}
          </div>
          {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {!comment.deleted ? (
              <CommentReact
                liked={comment.liked}
                reaction={comment.reaction}
                likes={comment.likes}
                disabled={!user}
                onReact={(type) => onReact(comment.id, type)}
              />
            ) : null}
            {user && !comment.deleted ? (
              <Button size="sm" variant="ghost" onClick={() => setReplying((value) => !value)}>
                Répondre
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(true);
                }}
              >
                Modifier
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                onClick={() => void onDelete(comment.id)}
              >
                Supprimer
              </Button>
            ) : null}
          </div>
          {replying ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Votre réponse…"
                className="min-h-16"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setReplying(false)}>
                  Annuler
                </Button>
                <Button size="sm" disabled={busy || !reply.trim()} onClick={() => void sendReply()}>
                  Répondre
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {comment.replies.map((replyItem) => (
            <CommentItem
              key={replyItem.id}
              comment={replyItem}
              user={user}
              postAuthorId={postAuthorId}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              nested
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
