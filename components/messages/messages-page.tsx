"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, CheckCheck, Download, ExternalLink, FileText, Paperclip, Pencil, Send, Smile, SmilePlus, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/ui/avatar";
import { deleteDirectMessageAction, editDirectMessageAction, listConversationMessagesAction, listConversationsAction, openConversationAction, sendDirectMessageAction, toggleMessageReactionAction, uploadMessageAttachmentAction } from "@/server/actions/messaging.actions";
import { fetchPrivateMessageAttachment, type StoredMessageAttachment } from "@/lib/message-attachments-api";

type ConversationRow = { id: string; member: { id: string; name: string; role: string; avatarUrl: string | null; href: string; online: boolean }; lastMessage: string; lastMessageAt: string | null; unread: number };
type MessageAttachmentRow = { fileId: string; name: string; type: "image" | "document"; size: number };
type MessageReaction = { emoji: string; count: number; reactedByMe: boolean };
type MessageRow = { id: string; senderId: string; body: string; createdAt: string; readAt: string | null; editedAt?: string | null; attachments: MessageAttachmentRow[]; reactions: MessageReaction[] };

function PrivateAttachment({ attachment }: { attachment: MessageAttachmentRow }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void fetchPrivateMessageAttachment(attachment.fileId).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => setUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.fileId]);

  if (!url) return <span className="mt-2 block rounded-lg bg-black/5 px-3 py-2 text-xs">Chargement du fichier…</span>;
  if (attachment.type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <a href={url} target="_blank" rel="noreferrer" className="mt-2 block"><img src={url} alt={attachment.name} className="max-h-64 max-w-full rounded-lg object-contain" /></a>;
  }
  return <a href={url} download={attachment.name} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--sa-border)] bg-white/80 px-3 py-2 text-xs font-medium text-[var(--sa-text)] hover:bg-[var(--sa-hover)]"><FileText className="size-4 shrink-0"/><span className="truncate">{attachment.name}</span><Download className="size-4 shrink-0"/></a>;
}

export function MessagesPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const search = useSearchParams();
  const selectedId = search.get("conversation");
  const withId = search.get("with");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEmojis, setShowEmojis] = useState(false);
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; uploaded?: StoredMessageAttachment }>>([]);
  const [sending, setSending] = useState(false);

  const refreshConversations = useCallback(async () => {
    const rows = await listConversationsAction() as ConversationRow[];
    setConversations(rows);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await listConversationsAction() as ConversationRow[];
          if (cancelled) return;
          setConversations(rows);
          if (withId) {
            const opened = await openConversationAction(withId);
            if (!cancelled) router.replace(`/messages?conversation=${encodeURIComponent(opened.id)}`);
          }
          setError("");
        } catch (cause) {
          if (!cancelled) setError(cause instanceof Error ? cause.message : "Messagerie indisponible.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    const refreshTimer = window.setInterval(() => {
      void listConversationsAction().then((rows) => {
        if (!cancelled) setConversations(rows as ConversationRow[]);
      }).catch(() => undefined);
    }, 10_000);
    return () => { cancelled = true; window.clearTimeout(timer); window.clearInterval(refreshTimer); };
  }, [userId, withId, router]);

  useEffect(() => {
    if (!selectedId) {
      const clearTimer = window.setTimeout(() => setMessages([]), 0);
      return () => window.clearTimeout(clearTimer);
    }
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await listConversationMessagesAction(selectedId) as MessageRow[];
        if (!cancelled) { setMessages(rows); setError(""); }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Impossible de charger la conversation.");
      }
    };
    const timer = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 5000);
    return () => { cancelled = true; window.clearTimeout(timer); window.clearInterval(interval); };
  }, [selectedId]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!selectedId || (!text && !pendingFiles.length) || sending) return;
    setSending(true);
    try {
      const storedFiles: StoredMessageAttachment[] = [];
      for (let index = 0; index < pendingFiles.length; index += 1) {
        const item = pendingFiles[index];
        const formData = new FormData();
        formData.set("conversationId", selectedId);
        formData.set("file", item.file);
        const uploaded = item.uploaded ?? await uploadMessageAttachmentAction(formData);
        storedFiles.push(uploaded);
        if (!item.uploaded) setPendingFiles((items) => items.map((current, currentIndex) => currentIndex === index ? { ...current, uploaded } : current));
      }
      const created = await sendDirectMessageAction(selectedId, text, storedFiles.map((file) => file.id)) as MessageRow;
      setMessages((items) => [...items, created]);
      setBody("");
      setPendingFiles([]);
      await refreshConversations();
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  async function editMessage(message: MessageRow) {
    if (!selectedId || !editBody.trim()) return;
    try {
      await editDirectMessageAction(selectedId, message.id, editBody);
      setMessages(await listConversationMessagesAction(selectedId) as MessageRow[]);
      setEditingMessageId(null);
      setError("");
      await refreshConversations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Modification impossible.");
    }
  }

  async function deleteMessage(message: MessageRow) {
    if (!selectedId || !window.confirm("Supprimer définitivement ce message ?")) return;
    try {
      await deleteDirectMessageAction(selectedId, message.id);
      setMessages(await listConversationMessagesAction(selectedId) as MessageRow[]);
      await refreshConversations();
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Suppression impossible.");
    }
  }

  async function reactToMessage(message: MessageRow, emoji: string) {
    if (!selectedId) return;
    try {
      const result = await toggleMessageReactionAction(selectedId, message.id, emoji);
      setMessages((items) => items.map((item) => item.id === message.id ? { ...item, reactions: result.reactions } : item));
      setReactionTargetId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Réaction impossible.");
    }
  }

  if (!user) return <main className="mx-auto max-w-4xl px-4 py-8"><div className="sa-card p-6">Connectez-vous pour accéder à la messagerie.</div></main>;

  return (
    <main className="mx-auto w-full max-w-[1120px] px-3 py-5 pb-24 sm:px-4 md:pb-5">
      <div className="sa-card grid min-h-[70vh] overflow-hidden md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--sa-divider)] md:border-b-0 md:border-r">
          <header className="border-b border-[var(--sa-divider)] p-4"><h1 className="text-lg font-bold text-[var(--sa-text)]">Messagerie</h1><p className="mt-1 text-xs text-[var(--sa-text-secondary)]">Conversations privées avec votre réseau SmartApply</p></header>
          {loading ? <p className="p-4 text-sm text-[var(--sa-text-secondary)]">Chargement…</p> : conversations.length ? <ul className="max-h-[70vh] overflow-y-auto">{conversations.map((conversation) => <li key={conversation.id}><Link href={`/messages?conversation=${encodeURIComponent(conversation.id)}`} className={`flex gap-3 border-b border-[var(--sa-divider)] p-3 transition-colors hover:bg-[var(--sa-hover)] ${conversation.id === selectedId ? "bg-[var(--sa-action-soft)]" : ""}`}><Avatar name={conversation.member.name} initials={conversation.member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)} src={conversation.member.avatarUrl} className="size-11"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[var(--sa-text)]">{conversation.member.name}</span><span className="block truncate text-xs text-[var(--sa-text-secondary)]">{conversation.lastMessage || "Conversation ouverte"}</span></span><span className="flex shrink-0 flex-col items-end gap-1">{conversation.lastMessageAt ? <time className="text-[10px] text-[var(--sa-text-muted)]">{new Date(conversation.lastMessageAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</time> : null}{conversation.unread ? <span className="min-w-5 rounded-full bg-[var(--sa-action)] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">{conversation.unread}</span> : null}</span></Link></li>)}</ul> : <p className="p-4 text-sm text-[var(--sa-text-secondary)]">Aucune conversation. La messagerie s’ouvre après acceptation d’une invitation.</p>}
        </aside>
        <section className="flex min-h-[60vh] min-w-0 flex-col">
          {selected ? <header className="flex items-center gap-3 border-b border-[var(--sa-divider)] p-4"><Avatar name={selected.member.name} initials={selected.member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)} src={selected.member.avatarUrl} className="size-11"/><div className="min-w-0 flex-1"><Link href={selected.member.href} className="block truncate font-semibold text-[var(--sa-text)] hover:underline">{selected.member.name}</Link><p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--sa-text-secondary)]"><span>{selected.member.role === "COMPANY" ? "Entreprise" : "Candidat"}</span><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${selected.member.online ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden="true"/><span className={selected.member.online ? "text-emerald-700" : "text-[var(--sa-text-secondary)]"}>{selected.member.online ? "En ligne" : "Hors ligne"}</span></span></p></div><Link href={selected.member.href} aria-label={`Voir le profil de ${selected.member.name}`} title="Voir le profil" className="rounded-full p-2 text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]"><ExternalLink className="size-4"/></Link></header> : <div className="border-b border-[var(--sa-divider)] p-4 text-sm text-[var(--sa-text-secondary)]">Sélectionnez une conversation</div>}
          {error ? <p role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--sa-card)] p-4">{messages.map((message) => { const mine = message.senderId === user.id; return <div key={message.id} className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>{!mine && selected ? <Avatar name={selected.member.name} initials={selected.member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)} src={selected.member.avatarUrl} className="size-8"/> : null}<div className={`max-w-[85%] ${mine ? "items-end" : "items-start"}`}><div className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${mine ? "rounded-br-md bg-[#2563eb] text-white" : "rounded-bl-md border border-[var(--sa-border)] bg-white text-[var(--sa-text)]"}`}>
            {editingMessageId === message.id ? <div className="min-w-52"><textarea autoFocus value={editBody} onChange={(event) => setEditBody(event.target.value)} maxLength={4000} className="min-h-16 w-full resize-y rounded-lg border border-white/50 bg-white/95 p-2 text-sm text-slate-900 outline-none"/><div className="mt-2 flex justify-end gap-1"><button type="button" aria-label="Annuler la modification" onClick={() => setEditingMessageId(null)} className="rounded-md p-1.5 hover:bg-white/15"><X className="size-4"/></button><button type="button" aria-label="Enregistrer la modification" onClick={() => void editMessage(message)} className="rounded-md p-1.5 hover:bg-white/15"><Check className="size-4"/></button></div></div> : <>{message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}{message.attachments.map((attachment) => <PrivateAttachment key={attachment.fileId} attachment={attachment}/>)}</>}
            {editingMessageId !== message.id ? <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-blue-100" : "text-[var(--sa-text-muted)]"}`}><time>{new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</time>{message.editedAt ? <span>· modifié</span> : null}{mine && message.readAt ? <CheckCheck className="size-3" aria-label="Lu"/> : null}</span> : null}
          </div><div className={`mt-1 flex flex-wrap items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}>
            {message.reactions.map((reaction) => <button key={reaction.emoji} type="button" aria-pressed={reaction.reactedByMe} onClick={() => void reactToMessage(message, reaction.emoji)} className={`rounded-full border px-2 py-0.5 text-xs ${reaction.reactedByMe ? "border-blue-300 bg-blue-50" : "border-[var(--sa-border)] bg-white"}`}>{reaction.emoji} {reaction.count}</button>)}
            <button type="button" aria-label="Réagir au message" aria-expanded={reactionTargetId === message.id} onClick={() => setReactionTargetId((current) => current === message.id ? null : message.id)} className="rounded-full p-1 text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]"><SmilePlus className="size-4"/></button>
            {mine ? <><button type="button" aria-label="Modifier le message" onClick={() => { setEditingMessageId(message.id); setEditBody(message.body); }} className="rounded-full p-1 text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]"><Pencil className="size-3.5"/></button><button type="button" aria-label="Supprimer le message" onClick={() => void deleteMessage(message)} className="rounded-full p-1 text-red-500 hover:bg-red-50"><Trash2 className="size-3.5"/></button></> : null}
            {reactionTargetId === message.id ? ["👍", "❤️", "😊", "😂", "🎉", "🙏"].map((emoji) => <button key={emoji} type="button" onClick={() => void reactToMessage(message, emoji)} className="rounded-full bg-white p-1 text-sm shadow-sm hover:bg-blue-50" aria-label={`Réagir ${emoji}`}>{emoji}</button>) : null}
          </div></div></div>; })}</div>
          {selected ? <form onSubmit={(event) => void send(event)} className="relative border-t border-[var(--sa-divider)] bg-white p-3"><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={3} placeholder="Rédigez un message…" className="min-h-24 w-full resize-y rounded-xl border border-[var(--sa-input-border)] bg-[var(--sa-surface-soft)] px-3 py-3 text-sm outline-none focus:border-[var(--sa-action)]"/>{pendingFiles.length ? <ul className="mt-2 flex flex-wrap gap-2">{pendingFiles.map((item, index) => <li key={`${item.file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-lg bg-[var(--sa-surface-soft)] px-2.5 py-1.5 text-xs"><Paperclip className="size-3.5 shrink-0"/><span className="max-w-48 truncate">{item.file.name}</span><span className="text-[var(--sa-text-muted)]">{item.file.size < 10_000 ? `${Math.max(1, Math.ceil(item.file.size / 1024))} Ko` : `${(item.file.size / 1024 / 1024).toFixed(1)} Mo`}</span><button type="button" aria-label={`Retirer ${item.file.name}`} onClick={() => setPendingFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X className="size-3.5"/></button></li>)}</ul> : null}<div className="flex items-center justify-between gap-2 pt-2"><div className="flex items-center gap-1"><label className="cursor-pointer rounded-lg p-2 text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]" title="Joindre des images ou PDF"><Paperclip className="size-5"/><input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" multiple onChange={(event) => { const selectedFiles = Array.from(event.currentTarget.files ?? []); setPendingFiles((current) => [...current, ...selectedFiles.slice(0, Math.max(0, 5 - current.length)).map((file) => ({ file }))]); event.currentTarget.value = ""; }}/></label><div className="relative"><button type="button" aria-label="Ajouter un emoji" aria-expanded={showEmojis} onClick={() => setShowEmojis((open) => !open)} className="rounded-lg p-2 text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]"><Smile className="size-5"/></button>{showEmojis ? <div className="absolute bottom-11 left-0 z-10 flex gap-1 rounded-xl border border-[var(--sa-border)] bg-white p-2 shadow-lg">{["😊", "👍", "❤️", "🎉", "🙏"].map((emoji) => <button key={emoji} type="button" onClick={() => { setBody((value) => `${value}${emoji}`); setShowEmojis(false); }} className="rounded-md p-1.5 text-lg hover:bg-[var(--sa-hover)]" aria-label={`Ajouter ${emoji}`}>{emoji}</button>)}</div> : null}</div></div><button disabled={sending || (!body.trim() && !pendingFiles.length)} type="submit" className="sa-btn-primary inline-flex items-center gap-2 px-4 py-2 disabled:opacity-50"><Send className="size-4"/>{sending ? "Envoi…" : "Envoyer"}</button></div><p className="mt-1 text-[10px] text-[var(--sa-text-muted)]">Images et PDF · 8 Mo maximum par fichier · 5 fichiers maximum</p></form> : null}
        </section>
      </div>
    </main>
  );
}
