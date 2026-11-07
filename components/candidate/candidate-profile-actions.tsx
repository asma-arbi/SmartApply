"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Download,
  Flag,
  Info,
  MoreHorizontal,
  Plus,
  Send,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNetwork } from "@/hooks/use-network";
import { openConversationAction } from "@/server/actions/messaging.actions";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function CandidateProfileActions({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { following, follow, statusOf, connect, refresh } = useNetwork();
  const [flash, setFlash] = useState("");

  const firstName = candidateName.split(/\s+/)[0] || "ce membre";
  const isFollowing = following("candidate", candidateId);
  const connectStatus = statusOf(candidateId);

  function requireAuth() {
    if (user) return true;
    router.push("/login?next=" + encodeURIComponent(window.location.pathname));
    return false;
  }

  function show(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(""), 2800);
  }

  async function handleConnect() {
    if (!requireAuth()) return;
    connect(candidateId);
    show(connectStatus === "pending" ? "Invitation annulée." : connectStatus === "connected" ? "Connexion supprimée." : "Invitation envoyée. Elle sera active après acceptation.");
    window.setTimeout(() => void refresh(), 0);
  }

  async function handleMessage() {
    if (!requireAuth()) return;
    try {
      const conversation = await openConversationAction(candidateId);
      router.push(`/messages?conversation=${encodeURIComponent(conversation.id)}`);
    } catch (error) {
      show(error instanceof Error ? error.message : "La messagerie est disponible après acceptation de l’invitation.");
    }
  }

  function handleShareInMessage() {
    if (!requireAuth()) return;
    const url = `${window.location.origin}/candidats/${encodeURIComponent(candidateId)}`;
    const subject = encodeURIComponent(`Profil SmartApply — ${candidateName}`);
    const body = encodeURIComponent(
      `Voici le profil de ${candidateName} sur SmartApply :\n${url}\n`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleSavePdf() {
    show("Ouverture de l’impression PDF…");
    window.setTimeout(() => window.print(), 200);
  }

  function handleFollow() {
    if (!requireAuth()) return;
    const next = follow("candidate", candidateId);
    show(next ? `Vous suivez ${firstName}.` : `Vous ne suivez plus ${firstName}.`);
  }

  function handleReport() {
    if (!requireAuth()) return;
    show(`Signalement de ${firstName} enregistré. Notre équipe examinera le profil.`);
  }

  function handleBlock() {
    if (!requireAuth()) return;
    show(`${firstName} a été bloqué(e) localement sur cet appareil.`);
  }

  function handleAbout() {
    show(
      "Membre SmartApply — profil public candidat. Les infos affichées viennent de son CV.",
    );
  }

  const connectLabel =
    connectStatus === "connected"
      ? "Connecté"
      : connectStatus === "pending"
        ? "En attente"
        : "Se connecter";

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleConnect()}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors",
            connectStatus === "connected"
              ? "border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] text-[var(--sa-text-secondary)]"
              : connectStatus === "pending"
                ? "border border-[#2563eb]/35 bg-[#e8f0fe] text-[#2563eb]"
                : "bg-[#2563eb] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-[#1d4ed8]",
          )}
        >
          {connectStatus === "none" ? <UserPlus className="size-4" strokeWidth={2} /> : null}
          {connectLabel}
        </button>

        <button
          type="button"
          onClick={() => void handleMessage()}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-[#2563eb] bg-white px-4 text-[14px] font-semibold text-[#2563eb] transition-colors hover:bg-[#e8f0fe]"
        >
          <Send className="size-3.5" strokeWidth={2} />
          Message
        </button>

        <DropdownMenu
          align="start"
          className="min-w-[280px] rounded-[10px] border border-[var(--sa-border)] p-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
          trigger={
            <button
              type="button"
              aria-label="Plus d’options"
              className="inline-flex size-9 items-center justify-center rounded-full border-[1.5px] border-[#0f172a] bg-white text-[#0f172a] transition-colors hover:bg-[var(--sa-surface-soft)]"
            >
              <MoreHorizontal className="size-5" strokeWidth={2} />
            </button>
          }
        >
          <MenuRow icon={Send} label="Envoyer le profil dans un message" onClick={handleShareInMessage} />
          <MenuRow icon={Download} label="Enregistrer au format PDF" onClick={handleSavePdf} />
          <MenuRow
            icon={Plus}
            label={isFollowing ? `Ne plus suivre ${firstName}` : "Suivre"}
            onClick={handleFollow}
          />
          <DropdownMenuSeparator />
          <MenuRow icon={Flag} label={`Signaler ${firstName}`} onClick={handleReport} />
          <MenuRow icon={Ban} label={`Bloquer ${firstName}`} onClick={handleBlock} destructive />
          <DropdownMenuSeparator />
          <MenuRow icon={Info} label="À propos de ce membre" onClick={handleAbout} />
        </DropdownMenu>
      </div>

      {flash ? (
        <p className="text-[12.5px] font-medium text-[#2563eb]">{flash}</p>
      ) : null}
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Send;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <DropdownMenuItem
      destructive={destructive}
      onClick={onClick}
      className="rounded-[8px] px-3 py-2.5"
    >
      <span className="inline-flex items-center gap-3 font-medium">
        <Icon
          className={cn(
            "size-[18px] shrink-0",
            destructive ? "text-[var(--sa-danger)]" : "text-[var(--sa-text-secondary)]",
          )}
          strokeWidth={1.75}
        />
        <span className="text-[14px]">{label}</span>
      </span>
    </DropdownMenuItem>
  );
}
