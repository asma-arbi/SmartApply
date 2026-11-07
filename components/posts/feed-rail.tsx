"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  Building2,
  CalendarDays,
  Newspaper,
  Plus,
  Users,
} from "lucide-react";
import type { FeedSidebarData } from "@/lib/posts-api";
import { getCachedFeedSidebar } from "@/lib/sidebar-cache";
import { getMyProfileVisualsAction } from "@/server/actions/profile.actions";
import { useAuth } from "@/hooks/use-auth";
import { useMyCompany } from "@/hooks/use-catalog";
import { useNetwork } from "@/hooks/use-network";
import { Avatar } from "@/components/ui/avatar";
import { ProfilePhotoButton } from "@/components/profile/profile-photo-button";
import { CompanyFollowersSummary } from "@/components/company/company-followers-summary";
import { AddExperienceDialog } from "@/components/candidate/add-experience-dialog";
import { cn } from "@/lib/utils";
import { candidateDisplayName } from "@/lib/candidate-name";

const EMPTY_SIDEBAR: FeedSidebarData = {
  myStats: {
    publishedPosts: 0,
    draftPosts: 0,
    reactionsReceived: 0,
    commentsReceived: 0,
    bookmarks: 0,
    profileViews: 0,
    impressions: 0,
  },
  trendingTags: [],
  suggestedCompanies: [],
  suggestedCandidates: [],
  careerTips: [],
};

function loginNext(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}

export function FeedLeftRail({
  active,
}: {
  active?: "feed" | "mine" | "drafts" | "saved";
}) {
  const { user, ready } = useAuth();
  const { company, loading: companyLoading } = useMyCompany();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const box = searchParams.get("box");
  const [stats, setStats] = useState(EMPTY_SIDEBAR.myStats);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [experienceOpen, setExperienceOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load(force = false) {
      try {
        const data = await getCachedFeedSidebar(force, user?.id ?? "guest");
        if (!cancelled) setStats(data.myStats);
      } catch {
        if (!cancelled) setStats(EMPTY_SIDEBAR.myStats);
      }
    }
    function refreshAnalytics() {
      void getCachedFeedSidebar(true, user?.id ?? "guest").then((data) => {
        if (!cancelled) setStats(data.myStats);
      });
    }
    void load(true);
    const timer = window.setInterval(() => void load(), 120_000);
    window.addEventListener("smartapply:analytics-updated", refreshAnalytics);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("smartapply:analytics-updated", refreshAnalytics);
    };
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user) {
      const timer = window.setTimeout(() => {
        setAvatarUrl(null);
        setCoverUrl(null);
        setProfileName(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    const loadProfile = () => {
      void getMyProfileVisualsAction()
        .then((data) => {
          if (!cancelled) {
            setAvatarUrl(data.url);
            setCoverUrl(data.coverUrl ?? null);
            setProfileName(data.name?.trim() || null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAvatarUrl(null);
            setCoverUrl(null);
            setProfileName(null);
          }
        });
    };
    loadProfile();
    const interval = window.setInterval(loadProfile, 30_000);
    window.addEventListener("smartapply:profile-updated", loadProfile);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("smartapply:profile-updated", loadProfile);
    };
  }, [ready, user]);

  const isCompany = user?.role === "COMPANY" || user?.role === "ADMIN";
  const name = isCompany
    ? company?.name?.trim() || profileName?.trim() || (companyLoading ? "Chargement…" : "Votre entreprise")
    : user
      ? candidateDisplayName(profileName, user.name)
      : "Visiteur";
  const displayName = name
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const photoUrl = avatarUrl || (isCompany ? company?.logoUrl ?? null : null);
  const profileCoverUrl = coverUrl || (isCompany ? company?.coverUrl ?? null : null);
  const headline =
    user?.role === "COMPANY"
      ? ["Espace entreprise", company?.sector, "Recrutement"].filter(Boolean).join(" · ")
      : user?.role === "ADMIN"
        ? "Administration SmartApply"
        : user
          ? "Candidat · Ouvert aux opportunités"
          : "Rejoignez le réseau carrière";

  const profileHref =
    user?.role === "COMPANY"
      ? company?.id
        ? `/entreprises/${encodeURIComponent(company.id)}`
        : "/company"
      : user
        ? `/candidats/${encodeURIComponent(user.id)}`
        : loginNext("/");
  const experienceHref = user ? "/company?compose=1" : loginNext("/candidats/profil");

  const profileViews = user ? stats.profileViews : 0;
  const impressions = user ? stats.impressions : 0;
  const statsHref = user ? "/stats" : loginNext("/stats");
  const savedHref = user ? "/saved" : loginNext("/saved");
  const groupsHref = "/groupes";
  const newslettersHref = "/newsletters";
  const eventsHref = "/evenements";

  const savedActive = active === "saved" || pathname.startsWith("/saved");
  const groupsActive = pathname.startsWith("/groupes") || category === "COMPANY_ANNOUNCEMENT";
  const newslettersActive =
    pathname.startsWith("/newsletters") || category === "RECRUITMENT_NEWS";
  const eventsActive = pathname.startsWith("/evenements") || category === "OPEN_DAY";
  const statsActive = pathname.startsWith("/stats") || box === "mine" || active === "mine";

  return (
    <aside className="sticky top-[72px] hidden w-[var(--sa-rail-left)] shrink-0 space-y-2 self-start lg:block">
      {/* Profile — LinkedIn style */}
      <div className="sa-card overflow-hidden">
        <div
          className="sa-cover-blue relative h-[56px] bg-cover bg-center"
          style={profileCoverUrl ? { backgroundImage: `url("${profileCoverUrl}")` } : undefined}
        >
          <Link href={profileHref} aria-label="Ouvrir le profil" className="absolute inset-0">
            <div
              className="absolute inset-0 opacity-45"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 40%, rgba(255,255,255,0.35) 0%, transparent 45%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
              }}
            />
          </Link>
        </div>
        <div className="relative px-3 pb-3 pt-0">
          <div className="relative -mt-10 inline-block">
            <Link href={profileHref} className="inline-block">
              <Avatar
                name={displayName}
                initials={initials || "SA"}
                src={photoUrl}
                className={cn(
                  "size-[72px] rounded-full border-[2px] border-white text-[18px] font-bold text-white shadow-sm",
                  user ? "bg-[#2563eb]" : "bg-[#94a3b8]",
                )}
              />
            </Link>
            {user ? (
              <ProfilePhotoButton
                className="absolute bottom-0 right-0"
                onUploaded={(url) => setAvatarUrl(url)}
              />
            ) : null}
          </div>
          <Link
            href={profileHref}
            className="mt-2 block text-[16px] font-semibold leading-5 tracking-tight text-[var(--sa-text)] hover:underline"
          >
            {displayName}
          </Link>
          <p className="mt-1 line-clamp-2 text-[12px] leading-[1.333] text-[var(--sa-text-secondary)]">
            {headline}
          </p>
          <p className="mt-1 text-[12px] text-[var(--sa-text-muted)]">{isCompany ? company?.city || "Tunisie" : "Tunisie"}</p>
          {isCompany && company?.id ? (
            <CompanyFollowersSummary companyId={company.id} compact />
          ) : null}
          {user?.role === "CANDIDATE" ? (
            <button type="button" onClick={() => setExperienceOpen(true)} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-full border border-dashed border-[rgba(0,0,0,0.6)] text-[14px] font-semibold text-[var(--sa-text)] transition-colors hover:border-[rgba(0,0,0,0.9)] hover:bg-[rgba(0,0,0,0.04)]">
              <Plus className="size-4" strokeWidth={2} /> Expérience
            </button>
          ) : user?.role === "COMPANY" ? (
            <Link href={experienceHref} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-full border border-dashed border-[rgba(0,0,0,0.6)] text-[14px] font-semibold text-[var(--sa-text)] transition-colors hover:border-[rgba(0,0,0,0.9)] hover:bg-[rgba(0,0,0,0.04)]">
              <Plus className="size-4" strokeWidth={2} /> Créer un post
            </Link>
          ) : (
            <Link href={loginNext("/candidats/profil")} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-full border border-dashed border-[rgba(0,0,0,0.6)] text-[14px] font-semibold text-[var(--sa-text)] transition-colors hover:border-[rgba(0,0,0,0.9)] hover:bg-[rgba(0,0,0,0.04)]">
              <Plus className="size-4" strokeWidth={2} /> Expérience
            </Link>
          )}
        </div>
      </div>

      {/* Analytics — always clickable */}
      <div className="sa-card px-3 py-2">
        <Link
          href={statsHref}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--sa-hover)]",
            statsActive && "bg-[rgba(37,99,235,0.06)]",
          )}
        >
          <span className="text-[var(--sa-text-secondary)]">Vues du profil</span>
          <span className="tabular-nums font-semibold text-[#2563eb]">{profileViews}</span>
        </Link>
        <Link
          href={statsHref}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-[12px] transition-colors hover:bg-[var(--sa-hover)]",
            statsActive && "bg-[rgba(37,99,235,0.06)]",
          )}
        >
          <span className="text-[var(--sa-text-secondary)]">Impressions des posts</span>
          <span className="tabular-nums font-semibold text-[#2563eb]">{impressions}</span>
        </Link>
        <Link
          href={statsHref}
          className="mt-0.5 block rounded-lg px-1 py-1.5 text-[12px] font-semibold text-[var(--sa-text)] transition-colors hover:bg-[var(--sa-hover)] hover:text-[#2563eb] hover:underline"
        >
          Voir toutes les statistiques
        </Link>
      </div>

      {/* Shortcuts — LinkedIn principle, all active */}
      <nav className="sa-card py-1.5">
        <RailLink
          href={savedHref}
          active={savedActive}
          icon={Bookmark}
          label="Éléments enregistrés"
        />
        <RailLink
          href={groupsHref}
          active={groupsActive}
          icon={Users}
          label="Groupes"
        />
        <RailLink
          href={newslettersHref}
          active={newslettersActive}
          icon={Newspaper}
          label="Newsletters"
        />
        <RailLink
          href={eventsHref}
          active={eventsActive}
          icon={CalendarDays}
          label="Événements"
        />
      </nav>
      <AddExperienceDialog open={experienceOpen} onOpenChange={setExperienceOpen} />
    </aside>
  );
}

export function FeedRightRail({
  onTag,
  onCompany,
}: {
  onTag?: (tag: string) => void;
  onCompany?: (company: { id: string; name: string }) => void;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { following, follow } = useNetwork();
  const [data, setData] = useState<FeedSidebarData>(EMPTY_SIDEBAR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(force = false) {
      try {
        const next = await getCachedFeedSidebar(force, user?.id ?? "guest");
        if (!cancelled) setData(next);
      } catch {
        if (!cancelled) setData(EMPTY_SIDEBAR);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (!ready) return;
    void load(true);
    const timer = window.setInterval(() => void load(), 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, user]);

  const tipColors = ["#1d4ed8", "#2563eb", "#3b82f6"];
  const recommendedCompanies = data.suggestedCompanies
    .filter((company) => !following("company", company.id))
    .slice(0, 4);
  const recommendedCandidates = data.suggestedCandidates
    .filter((candidate) => !following("candidate", candidate.id))
    .slice(0, 4);
  const isCompanyViewer = user?.role === "COMPANY";

  return (
    <aside className="sticky top-[72px] hidden w-[var(--sa-rail-right)] shrink-0 space-y-2.5 self-start lg:block">
      <div className="sa-card p-3.5">
        <p className="text-[14px] font-semibold tracking-tight text-[var(--sa-text)]">
          Astuces du jour
        </p>
        <ul className="mt-1">
          {data.careerTips.map((tip, index) => (
            <li key={tip.id}>
              <Link
                href={`/posts/${encodeURIComponent(tip.id)}`}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-[var(--sa-hover)]"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
                  style={{ background: tipColors[index % tipColors.length] }}
                >
                  {tip.title.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[var(--sa-text)]">
                    {tip.title}
                  </span>
                  <span className="line-clamp-2 block text-[12px] text-[var(--sa-text-secondary)]">
                    {tip.excerpt}
                  </span>
                </span>
                <span className="text-[var(--sa-text-muted)]">›</span>
              </Link>
            </li>
          ))}
        </ul>
        {!loading && data.careerTips.length === 0 ? (
          <p className="mt-2 px-1 text-[12px] text-[var(--sa-text-secondary)]">
            Les conseils carrière publiés apparaîtront ici.
          </p>
        ) : null}
        {data.trendingTags.length > 0 ? (
          <div className="mt-2 border-t border-[var(--sa-divider)] pt-2">
            {data.trendingTags.slice(0, 5).map((item) => (
              <Link
                key={item.tag}
                href={`/?tag=${encodeURIComponent(item.tag)}`}
                onClick={(event) => {
                  if (!onTag) return;
                  event.preventDefault();
                  onTag(item.tag);
                }}
                className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-[var(--sa-hover)]"
              >
                <span className="text-[13px] font-semibold text-[#2563eb]">#{item.tag}</span>
                <span className="text-[11px] text-[var(--sa-text-muted)]">{item.count}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sa-card p-3.5">
        <p className="text-[14px] font-semibold tracking-tight text-[var(--sa-text)]">
          {isCompanyViewer ? "Candidats à découvrir" : "Ajouter à votre fil d&apos;actualité"}
        </p>
        {loading ? (
          <div className="mt-3 space-y-3">
            <div className="sa-skeleton h-12 w-full" />
          </div>
        ) : (isCompanyViewer ? recommendedCandidates.length === 0 : recommendedCompanies.length === 0) ? (
          <p className="mt-2 text-[12px] text-[var(--sa-text-secondary)]">
            Aucune suggestion pour le moment.
          </p>
        ) : isCompanyViewer ? (
          <ul className="mt-3 space-y-3">
            {recommendedCandidates.map((candidate) => {
              const initials = candidate.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
              const candidateHref = `/candidats/${encodeURIComponent(candidate.id)}`;
              const isFollowing = following("candidate", candidate.id);
              return (
                <li key={candidate.id} className="flex gap-2">
                  <Link href={candidateHref} className="shrink-0">
                    <Avatar name={candidate.name} initials={initials || "CA"} src={candidate.avatarUrl} className="size-11 text-xs" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={candidateHref} className="block truncate text-[14px] font-semibold text-[var(--sa-text)] hover:text-[#2563eb] hover:underline">{candidate.name}</Link>
                    {(candidate.bio || candidate.headline || candidate.city) ? (
                      <p className="line-clamp-2 text-[12px] leading-[1.333] text-[var(--sa-text-secondary)]">
                        {[candidate.bio || candidate.headline, candidate.city].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {candidate.skills.length ? <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--sa-text-muted)]">{candidate.skills.join(" · ")}</p> : null}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button type="button" onClick={() => {
                        if (!user) { router.push(`/login?next=${encodeURIComponent(pathname)}`); return; }
                        follow("candidate", candidate.id);
                      }} className={cn("inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold tracking-tight transition-colors", isFollowing ? "border-[var(--sa-border)] text-[var(--sa-text-secondary)]" : "border-[#2563eb]/70 text-[#2563eb] hover:bg-[rgba(37,99,235,0.08)] hover:border-[#2563eb]")}>
                        {!isFollowing ? <Plus className="size-3.5" strokeWidth={2.25} /> : null}{isFollowing ? "Suivi" : "Suivre"}
                      </button>
                      <Link href={candidateHref} className="inline-flex h-7 items-center rounded-full border border-[var(--sa-border)] px-3 text-[12px] font-semibold text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-hover)] hover:text-[#2563eb]">Voir</Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-3 space-y-3">
            {recommendedCompanies.map((company) => {
              const initials = company.name
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const isFollowing = following("company", company.id);
              const companyHref = `/entreprises/${encodeURIComponent(company.id)}`;
              return (
                <li key={company.id} className="flex gap-2">
                  <Link href={companyHref} className="shrink-0">
                    <div className="flex size-11 items-center justify-center rounded-full bg-[#2563eb] text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.22)]">
                      {initials || <Building2 className="size-4" />}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={companyHref}
                      className="block truncate text-[14px] font-semibold text-[var(--sa-text)] hover:text-[#2563eb] hover:underline"
                    >
                      {company.name}
                    </Link>
                    <p className="line-clamp-2 text-[12px] leading-[1.333] text-[var(--sa-text-secondary)]">
                      Entreprise · {company.sector}
                      {company.city ? ` · ${company.city}` : ""}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            router.push(`/login?next=${encodeURIComponent(pathname)}`);
                            return;
                          }
                          if (onCompany) onCompany({ id: company.id, name: company.name });
                          follow("company", company.id);
                        }}
                        className={cn(
                          "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold tracking-tight transition-colors",
                          isFollowing
                            ? "border-[var(--sa-border)] text-[var(--sa-text-secondary)]"
                            : "border-[#2563eb]/70 text-[#2563eb] hover:bg-[rgba(37,99,235,0.08)] hover:border-[#2563eb]",
                        )}
                      >
                        {!isFollowing ? <Plus className="size-3.5" strokeWidth={2.25} /> : null}
                        {isFollowing ? "Abonné" : "Suivre"}
                      </button>
                      <Link
                        href={companyHref}
                        className="inline-flex h-7 items-center rounded-full border border-[var(--sa-border)] px-3 text-[12px] font-semibold text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-hover)] hover:text-[#2563eb]"
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href={isCompanyViewer ? "/candidats" : "/groupes"}
          className="mt-3 block rounded-lg px-2 py-1.5 text-[14px] font-semibold text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-hover)] hover:text-[#2563eb]"
        >
          Voir toutes les recommandations →
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-2 gap-y-1 px-2 text-[12px] leading-4 text-[var(--sa-text-muted)]">
        <Link href="/" className="hover:text-[#2563eb] hover:underline">
          SmartApply Tunisia
        </Link>
        <span>·</span>
        <Link href="/pwa" className="hover:text-[#2563eb] hover:underline">
          Aide
        </Link>
        <span>·</span>
        <Link href="/login" className="hover:text-[#2563eb] hover:underline">
          Confidentialité
        </Link>
      </div>
    </aside>
  );
}

function RailLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Bookmark;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-semibold tracking-tight transition-colors",
        active
          ? "bg-[rgba(37,99,235,0.08)] text-[#2563eb]"
          : "text-[var(--sa-text)] hover:bg-[var(--sa-hover)]",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-[#2563eb]" : "text-[var(--sa-text)]")}
        strokeWidth={1.6}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}
