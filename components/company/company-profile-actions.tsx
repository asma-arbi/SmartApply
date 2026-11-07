"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Ban,
  ExternalLink,
  Flag,
  MoreHorizontal,
  Plus,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNetwork } from "@/hooks/use-network";
import { openCompanyConversationAction } from "@/server/actions/messaging.actions";
import { companyConnectionStatusAction, connectToCompanyAction } from "@/server/actions/network.actions";
import { reportCompanyAction } from "@/server/actions/engagement.actions";
import { ReportDialog } from "@/components/posts/report-dialog";
import type { ReportReason } from "@/types/post";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function CompanyProfileActions({
  companyId,
  companyName,
  websiteUrl,
}: {
  companyId: string;
  companyName: string;
  websiteUrl?: string | null;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { following, follow, blockedCompany, setBlockedCompany } = useNetwork();
  const [flash, setFlash] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<{ companyId: string; userId: string; status: "none" | "pending" | "connected" } | null>(null);
  const connectionStatus = user?.role === "CANDIDATE" && connectionState?.companyId === companyId && connectionState.userId === user.id
    ? connectionState.status
    : "none";

  useEffect(() => {
    let cancelled = false;
    if (user?.role !== "CANDIDATE") {
      return;
    }
    const refreshStatus = () => {
      void companyConnectionStatusAction(companyId)
        .then((result) => { if (!cancelled) setConnectionState({ companyId, userId: user.id, status: result.status }); })
        .catch(() => { if (!cancelled) setConnectionState({ companyId, userId: user.id, status: "none" }); });
    };
    refreshStatus();
    window.addEventListener("smartapply:network-updated", refreshStatus);
    return () => {
      cancelled = true;
      window.removeEventListener("smartapply:network-updated", refreshStatus);
    };
  }, [companyId, user?.id, user?.role]);

  const isFollowing = following("company", companyId);
  const isBlocked = blockedCompany(companyId);

  function requireAuth() {
    if (user) return true;
    router.push("/login?next=" + encodeURIComponent(window.location.pathname));
    return false;
  }

  function show(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(""), 2800);
  }

  function handleFollow() {
    if (!requireAuth()) return;
    const next = follow("company", companyId);
    show(next ? `Vous suivez ${companyName}.` : `Vous ne suivez plus ${companyName}.`);
  }

  function handleWebsite() {
    if (websiteUrl && /^https?:\/\//i.test(websiteUrl)) {
      window.open(websiteUrl, "_blank", "noopener,noreferrer");
      return;
    }
    show("Cette entreprise n’a pas encore renseigné son site web.");
  }

  function handleShareInMessage() {
    const url = `${window.location.origin}/entreprises/${encodeURIComponent(companyId)}`;
    const shareData = { title: `Page SmartApply — ${companyName}`, text: `Découvrez ${companyName} sur SmartApply.`, url };
    if (navigator.share) {
      void navigator.share(shareData).catch(() => undefined);
      return;
    }
    void navigator.clipboard.writeText(url).then(() => show("Lien de la page copié."), () => show(url));
  }

  async function handleMessage() {
    if (!requireAuth()) return;
    try {
      const conversation = await openCompanyConversationAction(companyId);
      router.push(`/messages?conversation=${encodeURIComponent(conversation.id)}`);
    } catch (error) {
      show(error instanceof Error ? error.message : "La messagerie est disponible après acceptation de l’invitation.");
    }
  }

  async function handleConnect() {
    if (!requireAuth()) return;
    try {
      const result = await connectToCompanyAction(companyId);
      setConnectionState({ companyId, userId: user!.id, status: result.status });
      window.dispatchEvent(new Event("smartapply:network-updated"));
      show(result.status === "connected" ? "Vous êtes déjà connecté à cette entreprise." : "Invitation envoyée à l’entreprise.");
    } catch (error) {
      show(error instanceof Error ? error.message : "Impossible d’envoyer l’invitation.");
    }
  }

  async function handleReport(reason: ReportReason, details: string) {
    try {
      await reportCompanyAction(companyId, reason, details);
      show("Votre signalement a été transmis à l’équipe de modération.");
    } catch (error) {
      show(error instanceof Error ? error.message : "Impossible d’envoyer le signalement.");
    }
  }

  async function handleBlock() {
    if (!requireAuth()) return;
    try {
      await setBlockedCompany(companyId, !isBlocked);
      show(isBlocked ? `${companyName} a été débloquée.` : `${companyName} a été bloquée.`);
    } catch (error) {
      show(error instanceof Error ? error.message : "Impossible de modifier le blocage.");
    }
  }

  function handleCreatePage() {
    if (!user) {
      router.push("/login?next=" + encodeURIComponent("/company"));
      return;
    }
    if (user.role === "COMPANY") {
      router.push("/company");
      return;
    }
    show("Pour créer une page entreprise, connectez-vous avec un compte entreprise.");
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {user?.role !== "COMPANY" && user?.role !== "ADMIN" ? (
          <button
            type="button"
            onClick={() => void handleMessage()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0a66c2] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#004182]"
          >
            <Send className="size-3.5" strokeWidth={2} />
            Message
          </button>
        ) : null}
        {user?.role === "CANDIDATE" ? (
          <button type="button" onClick={() => void handleConnect()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#2563eb] px-4 text-[14px] font-semibold text-[#2563eb] hover:bg-[#e8f0fe]">
            {connectionStatus === "pending" ? "Invitation envoyée" : connectionStatus === "connected" ? "Connecté" : "Se connecter"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleFollow}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors",
            isFollowing
              ? "border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] text-[var(--sa-text-secondary)]"
              : "bg-[#2563eb] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-[#1d4ed8]",
          )}
        >
          {!isFollowing ? <Plus className="size-4" strokeWidth={2.25} /> : null}
          {isFollowing ? "Abonné" : "Suivre"}
        </button>

        <DropdownMenu
          align="start"
          className="min-w-[260px] rounded-[10px] border border-[var(--sa-border)] p-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
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
          <MenuRow
            icon={Send}
            label="Envoyer dans un message"
            onClick={handleShareInMessage}
          />
          <MenuRow
            icon={ExternalLink}
            label="Accéder au site web"
            onClick={handleWebsite}
          />
          <MenuRow
            icon={Flag}
            label={`Signaler ${companyName}`}
            onClick={() => {
              if (requireAuth()) setReportOpen(true);
            }}
          />
          <MenuRow
            icon={Ban}
            label={isBlocked ? `Débloquer ${companyName}` : `Bloquer ${companyName}`}
            onClick={handleBlock}
            destructive
          />
          <DropdownMenuSeparator />
          <MenuRow
            icon={Building2}
            label="Créer une page SmartApply"
            onClick={handleCreatePage}
          />
        </DropdownMenu>
      </div>

      {flash ? (
        <p className="text-[12.5px] font-medium text-[#2563eb]">{flash}</p>
      ) : null}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        onSubmit={(reason, details) => void handleReport(reason, details)}
        title="Signaler l’entreprise"
        description={`Pourquoi signalez-vous ${companyName} ?`}
      />
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
    <DropdownMenuItem destructive={destructive} onClick={onClick} className="rounded-[8px] px-3 py-2.5">
      <span className="inline-flex items-center gap-3 font-medium">
        <Icon className={`size-[18px] shrink-0 ${destructive ? "text-[var(--sa-danger)]" : "text-[var(--sa-text-secondary)]"}`} strokeWidth={1.75} />
        <span className="text-[14px]">{label}</span>
      </span>
    </DropdownMenuItem>
  );
}
