"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { getCachedFeedSidebar } from "@/lib/sidebar-cache";
import { useAuth } from "@/hooks/use-auth";
import { useNetwork } from "@/hooks/use-network";
import { cn } from "@/lib/utils";

type Company = {
  id: string;
  name: string;
  city: string;
  sector: string;
  jobsCount: number;
};

export function GroupsCompaniesPanel() {
  const { user } = useAuth();
  const { following, follow } = useNetwork();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCachedFeedSidebar(false, user?.id ?? "guest");
        if (!cancelled) setCompanies(data.suggestedCompanies);
      } catch {
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return <div className="relative z-[1] mt-3 sa-skeleton h-16 w-full" />;
  }

  if (companies.length === 0) return null;

  return (
    <div className="relative z-[1] mt-3 space-y-2">
      <p className="text-[12px] font-semibold text-[var(--sa-text-secondary)]">
        Entreprises à découvrir
      </p>
      <ul className="space-y-2">
        {companies.slice(0, 4).map((company) => {
          const isFollowing = following("company", company.id);
          const href = `/entreprises/${encodeURIComponent(company.id)}`;
          return (
            <li
              key={company.id}
              className="flex items-center gap-2 rounded-xl border border-[var(--sa-border)] bg-white/80 px-2.5 py-2"
            >
              <Link
                href={href}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-[11px] font-bold text-white"
              >
                {company.name.slice(0, 2).toUpperCase() || <Building2 className="size-3.5" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={href}
                  className="block truncate text-[13px] font-semibold text-[var(--sa-text)] hover:text-[#2563eb] hover:underline"
                >
                  {company.name}
                </Link>
                <p className="truncate text-[11px] text-[var(--sa-text-secondary)]">
                  {company.sector}
                  {company.city ? ` · ${company.city}` : ""}
                  {company.jobsCount ? ` · ${company.jobsCount} offres` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    window.location.href = `/login?next=${encodeURIComponent("/groupes")}`;
                    return;
                  }
                  follow("company", company.id);
                }}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-full border px-2.5 text-[12px] font-semibold",
                  isFollowing
                    ? "border-[var(--sa-border)] text-[var(--sa-text-secondary)]"
                    : "border-[#2563eb]/70 text-[#2563eb] hover:bg-[#eff5ff]",
                )}
              >
                {!isFollowing ? <Plus className="size-3" strokeWidth={2.25} /> : null}
                {isFollowing ? "Abonné" : "Suivre"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

