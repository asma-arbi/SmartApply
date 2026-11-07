"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Bookmark, Eye, FileText, Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getCachedFeedSidebar } from "@/lib/sidebar-cache";
import type { FeedSidebarData } from "@/lib/posts-api";
import { FeedLeftRail, FeedRightRail } from "@/components/posts/feed-rail";
import { PostListSkeleton } from "@/components/posts/post-list";
import { buttonVariants } from "@/components/ui/button";

function StatsContent() {
  const { user, ready } = useAuth();
  const [stats, setStats] = useState<FeedSidebarData["myStats"] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      const timer = window.setTimeout(() => setStats(null), 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    async function refreshStats() {
      try {
        const data = await getCachedFeedSidebar(true);
        if (!cancelled) {
          setStats(data.myStats);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Stats indisponibles.");
        }
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") void refreshStats();
    }
    void refreshStats();
    const interval = window.setInterval(() => void refreshStats(), 30_000);
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ready, user]);

  const impressions = stats?.impressions ?? 0;
  const profileViews = stats?.profileViews ?? 0;

  return (
    <div className="sa-feed-shell flex items-start justify-center gap-6 px-3 py-6 sm:px-4">
      <FeedLeftRail active="mine" />

      <div className="w-full max-w-[var(--sa-feed-center)] min-w-0 space-y-2.5">
        <div className="sa-feed-banner">
          <p className="relative z-[1] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
            Analytics
          </p>
          <h1 className="sa-display relative z-[1] mt-1 text-[22px] font-bold text-[var(--sa-ink)]">
            Vos statistiques
          </h1>
          <p className="relative z-[1] mt-1 text-[13px] text-[var(--sa-text-secondary)]">
            Suivez l’activité de vos posts, réactions, commentaires et favoris.
          </p>
        </div>

        {!ready ? (
          <PostListSkeleton />
        ) : !user ? (
          <div className="sa-card space-y-3 p-6 text-center">
            <BarChart3 className="mx-auto size-8 text-[#2563eb]" />
            <p className="font-semibold">Connexion requise</p>
            <p className="text-sm text-[var(--sa-text-secondary)]">
              Connectez-vous pour voir vos vues, impressions et favoris.
            </p>
            <Link href="/login?next=/stats" className={buttonVariants()}>
              Se connecter
            </Link>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !stats ? (
          <PostListSkeleton />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <StatCard
              icon={<Eye className="size-4" />}
              label="Vues du profil"
              value={profileViews}
              hint="Visites uniques enregistrées"
            />
            <StatCard
              icon={<BarChart3 className="size-4" />}
              label="Impressions des posts"
              value={impressions}
              hint="Vues réelles uniques des publications"
            />
            <StatCard
              icon={<FileText className="size-4" />}
              label="Posts publiés"
              value={stats.publishedPosts}
              href="/?box=mine"
            />
            <StatCard
              icon={<FileText className="size-4" />}
              label="Brouillons"
              value={stats.draftPosts}
              href="/?box=drafts"
            />
            <StatCard
              icon={<Heart className="size-4" />}
              label="Réactions reçues"
              value={stats.reactionsReceived}
            />
            <StatCard
              icon={<MessageCircle className="size-4" />}
              label="Commentaires reçus"
              value={stats.commentsReceived}
            />
            <StatCard
              icon={<Bookmark className="size-4" />}
              label="Éléments enregistrés"
              value={stats.bookmarks}
              href="/saved"
            />
          </div>
        )}
      </div>

      <FeedRightRail />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--sa-text-secondary)]">
        <span className="text-[#2563eb]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-[28px] font-bold tabular-nums tracking-tight text-[#2563eb]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-[var(--sa-text-muted)]">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="sa-card block p-4 transition-colors hover:bg-[#f8fbff]">
        {inner}
      </Link>
    );
  }

  return <div className="sa-card p-4">{inner}</div>;
}

export default function StatsPage() {
  return (
    <Suspense fallback={<PostListSkeleton />}>
      <StatsContent />
    </Suspense>
  );
}

