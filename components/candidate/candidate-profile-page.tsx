"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Briefcase, GraduationCap, MapPin, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { homeForRole } from "@/lib/roles";
import { Avatar } from "@/components/ui/avatar";
import { CandidateProfileActions } from "@/components/candidate/candidate-profile-actions";
import { ProfileCoverButton } from "@/components/profile/profile-cover-button";
import { ProfilePhotoButton } from "@/components/profile/profile-photo-button";
import type { CandidateExperience } from "@/lib/letters-api";
import { ProfileViewTracker } from "@/components/analytics/post-impression-tracker";
import { updateCandidateBioAction } from "@/server/actions/letters.actions";
import { AddExperienceDialog } from "@/components/candidate/add-experience-dialog";
import { getCandidatePublicProfileAction, getMyProfileVisualsAction } from "@/server/actions/profile.actions";

type CandidatePublic = {
  id: string;
  name: string;
  city: string | null;
  headline: string;
  bio?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  skills: string[];
  education: string[];
  experiences: CandidateExperience[];
  languages: Array<{ name?: string; level?: string }>;
};

export function CandidateProfilePage({ candidateId }: { candidateId: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidatePublic | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [coverOverride, setCoverOverride] = useState<string | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [bioDraft, setBioDraft] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [bioMessage, setBioMessage] = useState("");
  const [experienceOpen, setExperienceOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingProfile(true);
      setProfileError("");
      try {
        const data = await getCandidatePublicProfileAction(candidateId);
        if (!cancelled) {
          setProfile(data as unknown as CandidatePublic);
          setBioDraft(data.bio ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setProfile(null);
          setProfileError(err instanceof Error ? err.message : "Profil introuvable.");
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  useEffect(() => {
    if (!user || user.id !== candidateId) return;
    let cancelled = false;
    void getMyProfileVisualsAction().then((visuals) => {
      if (!cancelled && visuals.coverUrl) setCoverOverride(visuals.coverUrl);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [candidateId, user]);

  const backHref = homeForRole(user?.role);
  const displayName = profile?.name ?? "Candidat";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isSelf = user?.id === candidateId;

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-4 px-3 py-5 sm:px-4">
      <AddExperienceDialog
        open={experienceOpen}
        onOpenChange={setExperienceOpen}
        onCreated={() => {
          void getCandidatePublicProfileAction(candidateId).then((next) => setProfile(next as unknown as CandidatePublic)).catch(() => {});
        }}
      />
      <ProfileViewTracker profileType="CANDIDATE" profileId={candidateId} enabled={Boolean(profile && !isSelf)} />
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--sa-action)] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Retour au fil
      </Link>

      <section className="sa-card overflow-hidden">
        <div
          className="sa-cover-blue relative h-40 w-full bg-cover bg-center sm:h-56"
          style={coverOverride || profile?.coverUrl ? { backgroundImage: `url("${coverOverride || profile?.coverUrl}")` } : undefined}
        >
          {isSelf ? <ProfileCoverButton onUploaded={setCoverOverride} /> : null}
        </div>
        <div className="px-5 pb-6 sm:px-7">
          <div className="relative -mt-14 inline-block sm:-mt-[76px]">
            <Avatar
              name={displayName}
              initials={loadingProfile ? "…" : initials || "CA"}
              src={avatarOverride || profile?.avatarUrl ? `${avatarOverride || profile?.avatarUrl}${(avatarOverride || profile?.avatarUrl)?.includes("?") ? "&" : "?"}v=${avatarVersion}` : undefined}
              className="size-[112px] rounded-full border-[5px] border-white bg-[#2563eb] text-[26px] font-bold text-white shadow-md sm:size-[128px]"
            />
            {isSelf ? <ProfilePhotoButton className="absolute bottom-1 right-1" onUploaded={(url) => { setAvatarOverride(url); setAvatarVersion(Date.now()); }} /> : null}
          </div>
          <h1 className="sa-display mt-4 text-[26px] font-extrabold leading-tight text-[var(--sa-text)] sm:text-[30px]">
            {loadingProfile ? "Chargement…" : displayName}
          </h1>
          {profile?.headline ? <p className="mt-1 max-w-3xl text-[15px] leading-6 text-[var(--sa-text-secondary)]">{profile.headline}</p> : null}
          {profile?.city ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-[var(--sa-text-secondary)]">
              <MapPin className="size-4" />{profile.city}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {isSelf ? (
              <>
                <button type="button" onClick={() => setExperienceOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0a66c2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#004182]">
                  <Plus className="size-4" /> Ajouter une expérience
                </button>
                <button type="button" onClick={() => { setEditingBio((value) => !value); setBioMessage(""); }} className="inline-flex h-10 items-center rounded-full border border-[#0a66c2] px-5 text-sm font-semibold text-[#0a66c2] transition-colors hover:bg-blue-50">
                  {editingBio ? "Annuler la bio" : profile?.bio ? "Modifier la bio" : "Ajouter une bio"}
                </button>
              </>
            ) : !loadingProfile ? (
              <CandidateProfileActions candidateId={candidateId} candidateName={displayName} />
            ) : null}
          </div>
          {profileError ? <p className="mt-3 text-sm text-[var(--sa-danger)]">{profileError}</p> : null}
        </div>
      </section>

      {profile ? (
        <section className="sa-card p-5 sm:p-6">
          <h2 className="sa-display text-[18px] font-bold text-[var(--sa-text)]">À propos</h2>
          {editingBio && isSelf ? (
            <form className="mt-3 space-y-2" onSubmit={async (event) => {
              event.preventDefault();
              setSavingBio(true);
              setBioMessage("");
              try {
                const result = await updateCandidateBioAction(bioDraft);
                setProfile((current) => current ? { ...current, bio: result.bio } : current);
                setBioDraft(result.bio);
                setEditingBio(false);
                setBioMessage("Bio enregistrée.");
              } catch (error) {
                setBioMessage(error instanceof Error ? error.message : "Impossible d’enregistrer la bio.");
              } finally {
                setSavingBio(false);
              }
            }}>
              <textarea value={bioDraft} onChange={(event) => setBioDraft(event.target.value)} maxLength={1200} rows={4} placeholder="Présentez votre parcours, vos compétences et ce que vous recherchez…" className="w-full resize-y rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface)] p-3 text-sm text-[var(--sa-text)] outline-none focus:border-[var(--sa-action)]" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--sa-text-muted)]">{bioDraft.length}/1 200</span>
                <button disabled={savingBio} className="rounded-full bg-[var(--sa-action)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingBio ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </form>
          ) : profile.bio ? (
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-[var(--sa-text-secondary)]">{profile.bio}</p>
          ) : (
            <p className="mt-3 text-[13px] text-[var(--sa-text-muted)]">{isSelf ? "Ajoutez une courte présentation à votre profil." : "Aucune présentation pour le moment."}</p>
          )}
          {bioMessage ? <p role="status" className="mt-2 text-xs text-[var(--sa-text-secondary)]">{bioMessage}</p> : null}
        </section>
      ) : null}

      {profile?.skills?.length ? (
        <section className="sa-card p-5">
          <h2 className="sa-display text-[16px] font-bold text-[var(--sa-text)]">Compétences</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-[8px] bg-[var(--sa-surface-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--sa-text-secondary)]"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {profile?.experiences?.length ? (
        <section className="sa-card p-5">
          <h2 className="sa-display inline-flex items-center gap-2 text-[16px] font-bold text-[var(--sa-text)]">
            <Briefcase className="size-4" />
            Expérience
          </h2>
          <ul className="mt-3 space-y-2">
            {profile.experiences.map((item, index) => (
              <li key={item.id ?? `${item.title}-${index}`} className="rounded-xl border border-[var(--sa-border)] p-4 text-[13px] text-[var(--sa-text-secondary)]">
                <span className="block font-semibold text-[var(--sa-text)]">{item.title}</span>
                <span className="block">{item.company}{item.location ? ` · ${item.location}` : ""}</span>
                <span className="mt-1 block text-xs">{item.years}{item.employmentType ? ` · ${item.employmentType.replaceAll("_", " ").toLowerCase()}` : ""}{item.locationType ? ` · ${item.locationType.toLowerCase()}` : ""}</span>
                {item.description ? <p className="mt-2 whitespace-pre-wrap">{item.description}</p> : null}
                {item.skills?.length ? <p className="mt-2 text-xs"><strong>Compétences :</strong> {item.skills.join(" · ")}</p> : null}
                {item.mediaUrl ? <a className="mt-2 inline-block font-semibold text-[var(--sa-action)] hover:underline" href={item.mediaUrl} target="_blank" rel="noreferrer">Voir le média associé</a> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile?.education?.length ? (
        <section className="sa-card p-5">
          <h2 className="sa-display inline-flex items-center gap-2 text-[16px] font-bold text-[var(--sa-text)]">
            <GraduationCap className="size-4" />
            Formation
          </h2>
          <ul className="mt-3 space-y-1.5 text-[13px] text-[var(--sa-text-secondary)]">
            {profile.education.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loadingProfile && profile && !profile.skills.length && !profile.experiences.length && !profile.education.length ? (
        <section className="sa-card p-5 text-[13px] text-[var(--sa-text-secondary)]">
          Ce candidat n’a pas encore complété son CV public. Vous pouvez le suivre ou lui envoyer une
          invitation de connexion.
        </section>
      ) : null}
    </div>
  );
}
