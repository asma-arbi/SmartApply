"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { companyFollowersSummaryAction } from "@/server/actions/network.actions";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

type FollowerSummary = Awaited<ReturnType<typeof companyFollowersSummaryAction>>;

export function CompanyFollowersSummary({
  companyId,
  compact = false,
}: {
  companyId: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<{ companyId: string; data: FollowerSummary } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await companyFollowersSummaryAction(companyId);
        if (!cancelled) setSummary({ companyId, data });
      } catch {
        if (!cancelled) setSummary(null);
      }
    }
    const refresh = () => void load();
    void load();
    window.addEventListener("smartapply:network-updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("smartapply:network-updated", refresh);
    };
  }, [companyId, user?.id]);

  const current = summary?.companyId === companyId ? summary.data : null;
  if (!current) {
    return <p className={compact ? "mt-1 text-[11px] text-[var(--sa-text-muted)]" : "mt-3 text-[13px] text-[var(--sa-text-secondary)]"}>Chargement des abonnés…</p>;
  }

  const mutualNames = current.mutualFollowers.map((person) => person.name);
  const remaining = Math.max(0, current.count - mutualNames.length);
  const followerText = compact
    ? `${current.count} abonné${current.count === 1 ? "" : "s"}`
    : mutualNames.length > 0
    ? `${mutualNames.join(", ")}${remaining > 0 ? ` et ${remaining} autre${remaining > 1 ? "s" : ""} relation${remaining > 1 ? "s" : ""}` : ""} ${current.count > 1 ? "suivent" : "suit"} cette page`
    : current.count === 0
      ? "Aucun abonné pour le moment"
      : `${current.count} personne${current.count > 1 ? "s" : ""} ${current.count > 1 ? "suivent" : "suit"} cette page`;

  return (
    <div className={compact ? "mt-1 flex items-center gap-1.5 text-[11px] text-[var(--sa-text-secondary)]" : "mt-3 flex items-center gap-2 text-[13px] text-[var(--sa-text-secondary)]"}>
      {!compact && current.mutualFollowers.length > 0 ? (
        <div className="flex shrink-0 items-center pl-1">
          {current.mutualFollowers.map((person, index) => (
            <Link
              key={person.id}
              href={`/candidats/${encodeURIComponent(person.id)}`}
              title={person.name}
              aria-label={`Profil de ${person.name}`}
              className={index > 0 ? "-ml-2" : ""}
            >
              <Avatar
                name={person.name}
                initials={person.name.slice(0, 2).toUpperCase()}
                src={person.avatarUrl}
                className={compact ? "size-5 border border-white text-[8px]" : "size-7 border-2 border-white text-[9px]"}
              />
            </Link>
          ))}
        </div>
      ) : null}
      <p className="min-w-0">{followerText}</p>
    </div>
  );
}
