"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useNetwork } from "@/hooks/use-network";
import { cn } from "@/lib/utils";
import type { NetworkTargetType } from "@/lib/network";

export function FollowButton({
  type,
  id,
  className,
  compact,
}: {
  type: NetworkTargetType;
  id: string;
  className?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { following, follow } = useNetwork();
  const active = following(type, id);

  return (
    <button
      type="button"
      className={cn(
        compact
          ? "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[13px] font-semibold tracking-tight transition-colors"
          : "sa-btn-secondary inline-flex items-center gap-1 px-3.5 py-1.5 text-[13px]",
        active
          ? compact
            ? "text-[var(--sa-text-secondary)]"
            : "border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] text-[var(--sa-text-secondary)]"
          : compact
            ? "!text-[#2563eb] hover:bg-[rgba(37,99,235,0.08)]"
            : "!border-[#2563eb] !text-[#2563eb]",
        className,
      )}
      style={
        active
          ? undefined
          : compact
            ? { color: "#2563eb" }
            : { color: "#2563eb", borderColor: "#2563eb" }
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!user) {
          router.push("/login?next=" + encodeURIComponent(window.location.pathname));
          return;
        }
        follow(type, id);
      }}
    >
      {!active && compact ? <span className="text-[15px] leading-none">+</span> : null}
      {active ? "Abonné" : "Suivre"}
    </button>
  );
}

export function ConnectButton({
  candidateId,
  className,
  compact,
}: {
  candidateId: string;
  className?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { statusOf, connect } = useNetwork();
  const status = statusOf(candidateId);

  if (user?.id === candidateId) return null;

  const label =
    status === "connected"
      ? "Connecté"
      : status === "pending"
        ? "En attente"
        : compact
          ? "Connecter"
          : "Se connecter";

  return (
    <button
      type="button"
      className={cn(
        compact
          ? "rounded-full px-2.5 py-0.5 text-[12px] font-semibold tracking-tight transition-colors"
          : "inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-[13px] font-semibold tracking-tight transition-colors",
        status === "connected"
          ? "border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] text-[var(--sa-text-secondary)]"
          : status === "pending"
            ? "border border-[#2563eb]/35 bg-[#eff5ff] text-[#2563eb]"
            : compact
              ? "border border-[#2563eb]/70 text-[#2563eb] hover:bg-[#eff5ff]"
              : "bg-[#2563eb] text-white shadow-[0_1px_2px_rgba(37,99,235,0.25)] hover:bg-[#1d4ed8]",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!user) {
          router.push("/login?next=" + encodeURIComponent(window.location.pathname));
          return;
        }
        connect(candidateId);
      }}
    >
      {label}
    </button>
  );
}
