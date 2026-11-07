"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MessageCircle, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNetwork } from "@/hooks/use-network";
import { Avatar } from "@/components/ui/avatar";
import { listNetworkNotificationsAction, markNotificationsReadAction } from "@/server/actions/messaging.actions";

type Notice = { id: string; type: "CONNECTION_ACCEPTED"; read: boolean; createdAt: string; actor: { id: string; name: string; role: string; avatarUrl: string | null; href: string } };

export function NetworkPage() {
  const { user } = useAuth();
  const { incomingRequests, respondToRequest, refresh } = useNetwork();
  const [notifications, setNotifications] = useState<Notice[]>([]);
  const [noticeError, setNoticeError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void listNetworkNotificationsAction().then(async (data) => {
        if (cancelled) return;
        setNotifications(data.items as Notice[]);
        if (data.unread > 0) {
          await markNotificationsReadAction();
          if (!cancelled) setNotifications((items) => items.map((item) => ({ ...item, read: true })));
        }
      }).catch((error: unknown) => {
        if (!cancelled) setNoticeError(error instanceof Error ? error.message : "Notifications indisponibles.");
      });
    }, 0);
    void refresh();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      await refresh();
      try {
        const data = await listNetworkNotificationsAction();
        if (cancelled) return;
        setNotifications(data.items as Notice[]);
        if (data.unread > 0) {
          await markNotificationsReadAction();
          if (!cancelled) setNotifications((items) => items.map((item) => ({ ...item, read: true })));
        }
      } catch {
        // Keep the last notification state when the refresh is temporarily unavailable.
      }
    };
    const interval = window.setInterval(() => { void sync(); }, 20_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [refresh]);

  async function reply(requesterId: string, accept: boolean) {
    setBusy(requesterId);
    setNoticeError("");
    try {
      await respondToRequest(requesterId, accept);
      if (accept) {
        const next = await listNetworkNotificationsAction();
        setNotifications(next.items as Notice[]);
      }
    } catch (error) {
      setNoticeError(error instanceof Error ? error.message : "Impossible de répondre à cette invitation.");
    } finally {
      setBusy("");
    }
  }

  if (!user) return <main className="mx-auto max-w-3xl px-4 py-8"><div className="sa-card p-6 text-sm">Connectez-vous pour voir votre réseau.</div></main>;

  return (
    <main className="mx-auto w-full max-w-[900px] space-y-4 px-3 py-6 sm:px-4">
      <header className="sa-card p-5"><h1 className="sa-display text-2xl font-bold text-[var(--sa-text)]">Mon réseau</h1><p className="mt-1 text-sm text-[var(--sa-text-secondary)]">Invitations, acceptations et échanges sur SmartApply.</p></header>
      {noticeError ? <p role="alert" className="sa-card p-3 text-sm text-[var(--sa-danger)]">{noticeError}</p> : null}
      <section className="sa-card p-4">
        <h2 className="font-semibold text-[var(--sa-text)]">Invitations reçues <span className="text-[var(--sa-text-muted)]">{incomingRequests.length}</span></h2>
        {incomingRequests.length ? <ul className="mt-3 divide-y divide-[var(--sa-divider)]">{incomingRequests.map((request) => {
          const href = request.href;
          return <li key={request.requesterId} className="flex flex-wrap items-center gap-3 py-3">
            <Link href={href}><Avatar name={request.name} initials={request.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)} className="size-11" /></Link>
            <div className="min-w-0 flex-1"><Link href={href} className="font-semibold text-[var(--sa-text)] hover:underline">{request.name}</Link><p className="text-xs text-[var(--sa-text-secondary)]">{request.role === "COMPANY" ? "Entreprise" : "Candidat"} souhaite rejoindre votre réseau.</p></div>
            <button disabled={busy === request.requesterId} type="button" onClick={() => void reply(request.requesterId, true)} className="inline-flex items-center gap-1 rounded-full bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><Check className="size-4"/> Accepter</button>
            <button disabled={busy === request.requesterId} type="button" onClick={() => void reply(request.requesterId, false)} className="inline-flex items-center gap-1 rounded-full border border-[var(--sa-border)] px-3 py-2 text-sm font-semibold text-[var(--sa-text-secondary)] disabled:opacity-60"><X className="size-4"/> Refuser</button>
          </li>;
        })}</ul> : <p className="mt-3 text-sm text-[var(--sa-text-secondary)]">Aucune invitation en attente.</p>}
      </section>
      <section id="notifications" className="sa-card scroll-mt-24 p-4">
        <h2 className="font-semibold text-[var(--sa-text)]">Notifications</h2>
        {notifications.length ? <ul className="mt-2 divide-y divide-[var(--sa-divider)]">{notifications.map((notice) => <li key={notice.id} className="flex items-center gap-3 py-3"><Avatar name={notice.actor.name} initials={notice.actor.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)} src={notice.actor.avatarUrl} className="size-10"/><p className="min-w-0 flex-1 text-sm"><Link href={notice.actor.href} className="font-semibold hover:underline">{notice.actor.name}</Link> a accepté votre invitation.</p><Link href={`/messages?with=${encodeURIComponent(notice.actor.id)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--sa-action)]"><MessageCircle className="size-4"/> Message</Link></li>)}</ul> : <p className="mt-3 text-sm text-[var(--sa-text-secondary)]">Aucune notification de connexion pour le moment.</p>}
      </section>
    </main>
  );
}
