"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCatalogCompanies } from "@/hooks/use-catalog";
import { usePosts } from "@/hooks/use-posts";
import { useNetwork } from "@/hooks/use-network";
import { homeForRole } from "@/lib/roles";
import { Avatar } from "@/components/ui/avatar";
import { ProfilePhotoButton } from "@/components/profile/profile-photo-button";
import { CompanyProfileActions } from "@/components/company/company-profile-actions";
import { CompanyPublicContactsEditor } from "@/components/company/company-public-contacts-editor";
import { ProfileCoverButton } from "@/components/profile/profile-cover-button";
import { ProfileViewTracker } from "@/components/analytics/post-impression-tracker";
import { CompanyFollowersSummary } from "@/components/company/company-followers-summary";
import { PostList, PostListSkeleton } from "@/components/posts/post-list";
import { getMyProfileVisualsAction } from "@/server/actions/profile.actions";
import { useCallback } from "react";

export function CompanyProfilePage({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const { companies, loading: catalogLoading } = useCatalogCompanies();
  const company = companies.find((item) => item.id === companyId) ?? null;
  const { blockedCompany } = useNetwork();
  const isBlocked = blockedCompany(companyId);
  const {
    posts,
    isLoading: postsLoading,
    hasMore: hasMorePosts,
    loadingMore: loadingMorePosts,
    loadMore: loadMorePosts,
    error: postsError,
    like,
    bookmark,
    comment,
  } = usePosts("PUBLISHED", { companyId }, { mine: false });
  const [logoOverride, setLogoOverride] = useState<string | null>(null);
  const [coverOverride, setCoverOverride] = useState<string | null>(null);
  const [contactOverrides, setContactOverrides] = useState<{ websiteUrl: string; contactEmail: string } | null>(null);

  useEffect(() => {
    if (!user || (user.role !== "COMPANY" && user.role !== "ADMIN")) return;
    let cancelled = false;
    void getMyProfileVisualsAction().then((profile) => {
      if (cancelled || profile.companyId !== companyId) return;
      if (profile.url) setLogoOverride((current) => current ?? profile.url ?? null);
      if (profile.coverUrl) setCoverOverride((current) => current ?? profile.coverUrl ?? null);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [companyId, user]);

  const backHref = homeForRole(user?.role);
  const displayName = company?.name ?? "Entreprise";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isOwner = Boolean(user && (user.role === "COMPANY" || user.role === "ADMIN") && company);
  const logoUrl = logoOverride || company?.logoUrl || null;
  const websiteUrl = contactOverrides?.websiteUrl ?? company?.websiteUrl ?? "";
  const contactEmail = contactOverrides?.contactEmail ?? company?.contactEmail ?? "";

  const guarded = useCallback(async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
    } catch {
      window.alert(message);
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-4 px-3 py-5 sm:px-4">
      <ProfileViewTracker profileType="COMPANY" profileId={companyId} enabled={Boolean(company)} />
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--sa-action)] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Retour au fil
      </Link>

      <section id="accueil" className="sa-card relative overflow-visible">
        <div
          className="sa-cover-blue relative h-32 w-full rounded-t-[inherit] bg-cover bg-center sm:h-40"
          style={coverOverride || company?.coverUrl ? { backgroundImage: `url("${coverOverride || company?.coverUrl}")` } : undefined}
        >
          {isOwner ? <ProfileCoverButton onUploaded={setCoverOverride} /> : null}
        </div>

        <div className="px-5 pb-5 pt-0">
          <div className="relative -mt-10 inline-block">
            <Avatar
              name={displayName}
              initials={catalogLoading && !company ? "…" : initials || "SA"}
              src={logoUrl}
              className="size-[88px] rounded-[18px] border-[4px] border-white bg-[#0c1222] text-[22px] font-bold tracking-normal text-white shadow-md"
            />
            {isOwner ? (
              <ProfilePhotoButton
                className="absolute bottom-1 right-1"
                onUploaded={(url) => setLogoOverride(url)}
              />
            ) : null}
          </div>

          <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--sa-action)]">
              Profil entreprise
            </p>
            <h1 className="sa-display mt-1 text-[26px] font-extrabold leading-tight text-[var(--sa-text)] sm:text-[28px]">
              {company?.name ?? (catalogLoading ? "Chargement…" : "Entreprise introuvable")}
            </h1>

            {company ? (
              <>
                <ul className="mt-3 flex flex-col gap-2 text-[14px] text-[var(--sa-text-secondary)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                  <li className="inline-flex items-center gap-1.5">
                    <Briefcase className="size-4 shrink-0 text-[var(--sa-text-muted)]" />
                    <span>{company.sector}</span>
                  </li>
                  {company.city ? (
                    <li className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 shrink-0 text-[var(--sa-text-muted)]" />
                      <span>{company.city}</span>
                    </li>
                  ) : null}
                  <li
                    className={
                      company.isVerified
                        ? "inline-flex items-center gap-1.5 font-semibold text-[var(--sa-action)]"
                        : "inline-flex items-center gap-1.5 text-[var(--sa-text-muted)]"
                    }
                  >
                    <ShieldCheck className="size-4 shrink-0" />
                    <span>{company.isVerified ? "Entreprise vérifiée" : "Non vérifiée"}</span>
                  </li>
                </ul>
                <div id="personnes" className="scroll-mt-28"><CompanyFollowersSummary companyId={company.id} /></div>
                <CompanyProfileActions
                  companyId={company.id}
                  companyName={company.name}
                  websiteUrl={websiteUrl}
                />
                {isOwner ? (
                  <CompanyPublicContactsEditor
                    companyId={company.id}
                    websiteUrl={websiteUrl}
                    contactEmail={contactEmail}
                    onSaved={setContactOverrides}
                  />
                ) : null}
              </>
            ) : !catalogLoading ? (
              <p className="mt-2 text-sm text-[var(--sa-danger)]">
                Cette entreprise n’existe pas ou n’est plus dans le catalogue.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {company ? (
        <nav aria-label="Navigation de la page entreprise" className="sa-card sticky top-[72px] z-10 flex gap-1 overflow-x-auto px-3 py-2 sm:px-5">
          {[
            ["Accueil", "#accueil"],
            ["À propos", "#apropos"],
            ["Posts", "#posts"],
            ["Emplois", "#emplois"],
            ["Personnes", "#personnes"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="shrink-0 rounded-md px-3 py-2 text-[14px] font-semibold text-[var(--sa-text-secondary)] hover:bg-[var(--sa-action-soft)] hover:text-[var(--sa-action)]">
              {label}
            </a>
          ))}
        </nav>
      ) : null}

      {company ? (
        <section id="apropos" className="sa-card p-5">
          <h2 className="sa-display text-[18px] font-bold text-[var(--sa-text)]">À propos</h2>
          <p className="mt-2 text-[14px] text-[var(--sa-text-secondary)]">
            {company.name} · {company.sector}{company.city ? ` · ${company.city}` : ""}
          </p>
        </section>
      ) : null}

      {company ? (
        <section id="posts" className="space-y-3 scroll-mt-28">
          <div className="sa-card px-5 py-4">
            <h2 className="sa-display text-[20px] font-bold text-[var(--sa-text)]">Publications</h2>
            <p className="mt-1 text-[13px] text-[var(--sa-text-secondary)]">
              Les actualités, conseils, annonces et autres publications de {company.name}.
            </p>
          </div>
          {isBlocked ? (
            <p className="sa-card p-4 text-sm text-[var(--sa-text-secondary)]">Vous avez bloqué cette entreprise. Ses publications sont masquées dans votre fil. Vous pouvez la débloquer depuis le menu du profil.</p>
          ) : null}
          {postsError ? <p role="alert" className="sa-card p-4 text-sm text-[var(--sa-danger)]">{postsError}</p> : null}
          {postsLoading ? (
            <PostListSkeleton />
          ) : (
            <>
              <PostList
                posts={posts}
                emptyTitle="Aucune publication pour le moment"
                emptyDescription={`${company.name} n’a pas encore publié de post.`}
                onLike={(id, type) => void guarded(() => like(id, type), "Réaction impossible. Connectez-vous puis réessayez.")}
                onBookmark={(id) => void guarded(() => bookmark(id), "Enregistrement impossible. Connectez-vous puis réessayez.")}
                onComment={(id, content, parentId) => guarded(() => comment(id, content, parentId), "Commentaire impossible. Connectez-vous puis réessayez.")}
              />
              {hasMorePosts ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={loadingMorePosts}
                    onClick={() => void loadMorePosts()}
                    className="sa-btn-secondary rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    {loadingMorePosts ? "Chargement…" : "Afficher plus de publications"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {!isBlocked && company?.jobs?.length ? (
        <section id="emplois" className="sa-card scroll-mt-28 p-5">
          <h2 className="sa-display text-[18px] font-bold text-[var(--sa-text)]">Offres ouvertes</h2>
          <p className="mt-1 text-[13px] text-[var(--sa-text-secondary)]">
            {company.jobs.length} offre{company.jobs.length > 1 ? "s" : ""} publiée
            {company.jobs.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-4 divide-y divide-[var(--sa-border)] rounded-[12px] border border-[var(--sa-border)]">
            {company.jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[var(--sa-text)]">{job.title}</p>
                  <p className="text-[12px] text-[var(--sa-text-muted)]">
                    {job.type}
                    {job.city ? ` · ${job.city}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
