"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AtSign,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Globe2,
  Hash,
  ImageIcon,
  Layers,
  Link2,
  Loader2,
  Lock,
  MapPin,
  MessageSquareText,
  PartyPopper,
  Pin,
  Smile,
  Sparkles,
  Upload,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { CATEGORIES, CELEBRATION_OPTIONS, FEED_CATEGORY_CHIPS, POST_KIND_LABELS } from "@/lib/constants";
import { isPostFeatureEnabled } from "@/lib/feature-flags";
import { uploadPostMediaAction } from "@/server/actions/profile.actions";
import { createPostAction } from "@/server/actions/posts.actions";
import { toPostPayload } from "@/lib/post-payload";
import type { JobDetails, PostCategory, PostKind, UserRole } from "@/types/post";
import { useAuth } from "@/hooks/use-auth";
import { useMyCompany } from "@/hooks/use-catalog";
import { getMyProfileVisualsAction } from "@/server/actions/profile.actions";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { JobDetailsFields } from "@/components/posts/job-details-fields";

const QUICK_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
  "🙂", "😉", "😍", "🥰", "😘", "🤩", "😎", "🤗",
  "👍", "👏", "🙌", "💪", "🔥", "✨", "🎉", "💯",
  "❤️", "💙", "💚", "🤝", "🚀", "⭐", "📌", "✅",
];

/* ───────────────────────── constants ───────────────────────── */

const CANDIDATE_CHIPS = FEED_CATEGORY_CHIPS.filter(
  (chip) =>
    chip.value === "tous" ||
    chip.value === "CAREER_ADVICE" ||
    chip.value === "RECRUITMENT_NEWS" ||
    chip.value === "INTERNSHIP_ANNOUNCEMENT",
).concat([
  { value: "TESTIMONIAL" as PostCategory, label: "Témoignage" },
  { value: "CAMPUS_NEWS" as PostCategory, label: "Campus" },
]);

const TRIGGER_ACTIONS: {
  id: PostKind;
  label: string;
  icon: typeof ImageIcon;
  color: string;
  companyOnly?: boolean;
}[] = [
  { id: "PHOTO", label: "Photo", icon: ImageIcon, color: "text-[#378fe9]" },
  { id: "VIDEO", label: "Vidéo", icon: Video, color: "text-[#2563eb]" },
  { id: "DOCUMENT", label: "Document", icon: FileText, color: "text-[#e7a33e]" },
  { id: "POLL", label: "Sondage", icon: BarChart3, color: "text-[#E16745]" },
  { id: "EVENT", label: "Événement", icon: CalendarDays, color: "text-[#2563eb]" },
  { id: "CELEBRATE", label: "Célébrer", icon: Smile, color: "text-[#E16745]" },
  { id: "JOB", label: "Lier une offre", icon: Briefcase, color: "text-[#2563eb]", companyOnly: true },
];

const COMPANY_CATEGORY_ICONS: Partial<Record<PostCategory, typeof Building2>> = {
  COMPANY_ANNOUNCEMENT: Building2,
  JOB_OPENING: Briefcase,
  INTERNSHIP_ANNOUNCEMENT: Layers,
  PFE_ANNOUNCEMENT: Sparkles,
  OPEN_DAY: MapPin,
  RECRUITMENT_NEWS: Users,
  CAREER_ADVICE: MessageSquareText,
  COMPANY_LIFE: PartyPopper,
};

function titleFrom(text: string, fallback: string) {
  const line = text.split("\n").map((part) => part.trim()).find(Boolean) ?? fallback;
  return line.slice(0, 180).padEnd(3, ".");
}

function parseTags(raw: string) {
  return raw
    .split(/[\s,;]+/)
    .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
    .filter((tag) => tag.length >= 2)
    .slice(0, 12);
}

function isUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/* ───────────────────── component ────────────────────────── */

export function PostComposer({
  role,
  onCreated,
}: {
  role: UserRole;
  onCreated?: (status: "PUBLISHED" | "DRAFT") => void;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const { company, companies } = useMyCompany();
  const searchParams = useSearchParams();
  const isCompany = role === "COMPANY" || role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<PostKind>("TEXT");
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "MEMBERS">("PUBLIC");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [offerUrl, setOfferUrl] = useState("");
  const [jobDetails, setJobDetails] = useState<JobDetails>({});
  const [poll, setPoll] = useState(["", ""]);
  const [duration, setDuration] = useState<1 | 3 | 7 | 14>(7);
  const [category, setCategory] = useState<PostCategory>(
    isCompany ? "INTERNSHIP_ANNOUNCEMENT" : "CAREER_ADVICE",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [asDraft, setAsDraft] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [pinned, setPinned] = useState(false);
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [occasion, setOccasion] = useState<
    "NEW_JOB" | "GRADUATION" | "PROMOTION" | "PROJECT" | "CERTIFICATE" | "ANNIVERSARY"
  >("GRADUATION");

  /* ── company post-as ── */
  const [publishAs, setPublishAs] = useState<"COMPANY" | "PERSONAL">("COMPANY");
  const [selectedCompanyId, setSelectedCompanyId] = useState(company?.id ?? "");
  const [showPublishAsMenu, setShowPublishAsMenu] = useState(false);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [urgentPost, setUrgentPost] = useState(false);
  const [language, setLanguage] = useState<"FR" | "EN">("FR");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    if (!ready || !user) {
      const timer = window.setTimeout(() => setProfilePhotoUrl(null), 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    void getMyProfileVisualsAction().then((profile) => {
      if (!cancelled) setProfilePhotoUrl(profile.url ?? null);
    }).catch(() => {
      if (!cancelled) setProfilePhotoUrl(null);
    });
    const refreshPhoto = () => {
      void getMyProfileVisualsAction().then((profile) => {
        if (!cancelled) setProfilePhotoUrl(profile.url ?? null);
      }).catch(() => undefined);
    };
    window.addEventListener("smartapply:avatar-updated", refreshPhoto);
    return () => {
      cancelled = true;
      window.removeEventListener("smartapply:avatar-updated", refreshPhoto);
    };
  }, [ready, user]);

  /* ── active step for company (tabbed sections) ── */
  const [activeSection, setActiveSection] = useState<"content" | "media" | "settings">("content");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const scheduleInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const effectiveCompanyId = selectedCompanyId || company?.id || "";
  const activeCompany = useMemo(
    () => companies.find((c) => c.id === effectiveCompanyId) ?? company,
    [companies, company, effectiveCompanyId],
  );
  const isOfferAnnouncement =
    isCompany &&
    publishAs === "COMPANY" &&
    ["JOB_OPENING", "INTERNSHIP_ANNOUNCEMENT", "PFE_ANNOUNCEMENT"].includes(category);

  const name = user?.email?.split("@")[0] ?? "Vous";
  const displayName = name.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const companyDisplayName = activeCompany?.name ?? displayName;

  const publisherLabel =
    isCompany && publishAs === "COMPANY"
      ? companyDisplayName
      : displayName;

  const categoryChips = isCompany
    ? FEED_CATEGORY_CHIPS.filter((chip) => chip.value !== "tous").concat(
        CATEGORIES.filter((c) =>
          ["JOB_OPENING", "PFE_ANNOUNCEMENT", "OPEN_DAY", "COMPANY_LIFE"].includes(String(c.value)),
        ).map((c) => ({ value: c.value as PostCategory, label: c.label })),
      )
    : CANDIDATE_CHIPS.filter((chip) => chip.value !== "tous");

  const triggers = TRIGGER_ACTIONS.filter((item) => {
    if (!isCompany && item.companyOnly) return false;
    if (item.id === "POLL" && !isPostFeatureEnabled("polls")) return false;
    if (
      (item.id === "DOCUMENT" || item.id === "PHOTO" || item.id === "VIDEO") &&
      !isPostFeatureEnabled("documents")
    ) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (!ready || searchParams.get("compose") !== "1") return;
    if (!user) {
      // Don't bounce to login if a token is still present (transient auth flicker).
      if (window.localStorage.getItem("smartapply-auth-token")) return;
      const next = isCompany ? "/company?compose=1" : "/?compose=1";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    const timer = window.setTimeout(() => {
      setOpen(true);
      setKind("TEXT");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("compose");
      const qs = params.toString();
      router.replace(qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isCompany, ready, router, searchParams, user]);

  const placeholder = useMemo(() => {
    if (kind === "JOB") return "Décrivez le poste, le stage ou la bourse…";
    if (kind === "POLL") return "Posez votre question de sondage…";
    if (kind === "CELEBRATE") return "Qu'est-ce que vous célébrez ?";
    if (isOfferAnnouncement) return "Décrivez votre offre : missions, profil recherché, conditions…";
    if (!isCompany) return "Partagez un conseil, un retour d'expérience…";
    return "De quoi souhaitez-vous parler ?";
  }, [isCompany, isOfferAnnouncement, kind]);

  const charCount = text.trim().length;

  function syncSectionForKind(next: PostKind) {
    if (!isCompany) return;
    if (next === "PHOTO" || next === "VIDEO" || next === "DOCUMENT") {
      setActiveSection("media");
      return;
    }
    setActiveSection("content");
  }

  function openWith(next: PostKind) {
    if (!ready) return;
    if (!user) {
      const nextPath = isCompany ? "/company?compose=1" : "/?compose=1";
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    setKind(next);
    setShowEmoji(false);
    syncSectionForKind(next);
    setError("");
    setOpen(true);
  }

  function activateToolbar(next: PostKind | "EMOJI") {
    if (next === "EMOJI") {
      // Toujours revenir au texte : sinon le textarea est démonté (onglet Options/Médias)
      setActiveSection("content");
      setShowSchedulePicker(false);
      setShowEmoji((v) => !v);
      window.setTimeout(() => textAreaRef.current?.focus(), 30);
      return;
    }
    setShowEmoji(false);
    setKind(next);
    syncSectionForKind(next);
    if (next === "PHOTO" || next === "VIDEO" || next === "DOCUMENT") {
      window.setTimeout(() => mediaInputRef.current?.click(), 0);
    }
  }

  function insertEmoji(emoji: string) {
    // Forcer l'onglet Contenu pour que le textarea existe
    if (isCompany && activeSection !== "content") {
      setActiveSection("content");
    }

    const el = textAreaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    setText(next);
    setShowEmoji(true);

    window.requestAnimationFrame(() => {
      const area = textAreaRef.current;
      if (!area) return;
      area.focus();
      const pos = start + emoji.length;
      try {
        area.setSelectionRange(pos, pos);
      } catch {
        /* ignore */
      }
    });
  }

  const emojiPanel = (
    <div
      className="rounded-xl border border-[var(--sa-border)] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      role="listbox"
      aria-label="Choisir un emoji"
    >
      <div className="mb-1.5 flex items-center justify-between px-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--sa-text-muted)]">
          Emojis
        </p>
        <button
          type="button"
          className="text-[11px] font-semibold text-[var(--sa-text-muted)] hover:text-[var(--sa-text)]"
          onClick={() => setShowEmoji(false)}
        >
          Fermer
        </button>
      </div>
      <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-10">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            title={emoji}
            className="inline-flex size-9 items-center justify-center rounded-lg text-[20px] leading-none transition-colors hover:bg-[#eff5ff]"
            onMouseDown={(event) => {
              // Garde le focus sur le textarea (sinon l'emoji ne s'insère pas bien)
              event.preventDefault();
            }}
            onClick={() => insertEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );

  async function handleMediaFile(file: File | undefined) {
    if (!file) return;
    setMediaUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const uploaded = await uploadPostMediaAction(formData);
      const absolute = new URL(uploaded.url, window.location.origin).href;
      setLinks(absolute);
      if (uploaded.type === "video") setKind("VIDEO");
      else if (uploaded.type === "document") setKind("DOCUMENT");
      else setKind("PHOTO");
      if (!imageAlt.trim()) setImageAlt(uploaded.name);
      syncSectionForKind(
        uploaded.type === "video" ? "VIDEO" : uploaded.type === "document" ? "DOCUMENT" : "PHOTO",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setMediaUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  }

  function requestClose() {
    if (text.trim() || links.trim()) {
      const ok = window.confirm("Fermer sans publier ? Votre texte ne sera pas enregistré.");
      if (!ok) return;
    }
    setShowEmoji(false);
    setShowSchedulePicker(false);
    setOpen(false);
  }

  function toAbsoluteUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (isUrl(trimmed)) return trimmed;
    if (trimmed.startsWith("/")) {
      try {
        return new URL(trimmed, window.location.origin).href;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  async function publish(status: "PUBLISHED" | "DRAFT" = "PUBLISHED") {
    const body = text.trim();
    if (body.length < 1) {
      setError("Écrivez quelque chose avant de publier.");
      return;
    }
    const urls = links
      .split(/\s+/)
      .map((item) => toAbsoluteUrl(item))
      .filter(Boolean);
    if (urls.some((url) => !isUrl(url))) {
      setError("Chaque média doit être un fichier uploadé ou un lien http/https.");
      return;
    }
    const mediaType =
      kind === "PHOTO" || kind === "VIDEO"
        ? kind === "VIDEO"
          ? "video"
          : "image"
        : kind === "DOCUMENT"
          ? "document"
          : null;
    if (mediaType && urls.length === 0) {
      setError("Ajoutez le lien du fichier.");
      return;
    }
    const choices = poll.map((item) => item.trim()).filter(Boolean);
    if (kind === "POLL" && choices.length < 2) {
      setError("Ajoutez au moins deux choix.");
      return;
    }
    if (kind === "EVENT" && !eventStartsAt.trim()) {
      setError("Indiquez la date de l'événement.");
      return;
    }
    if (coverImageUrl.trim() && !isUrl(coverImageUrl.trim())) {
      setError("L'image de couverture doit être un lien http ou https.");
      return;
    }
    if (offerUrl.trim() && !isUrl(offerUrl.trim())) {
      setError("Le lien de l’offre doit être une adresse http ou https valide.");
      return;
    }
    setLoading(true);
    setError("");
    setAsDraft(status === "DRAFT");
    try {
      const scheduleIso = scheduledAt
        ? new Date(scheduledAt).toISOString()
        : undefined;
      await createPostAction(toPostPayload(
        {
          title: titleFrom(body, POST_KIND_LABELS[kind]),
          content: body,
          category:
            kind === "JOB" && category === "INTERNSHIP_ANNOUNCEMENT"
              ? "JOB_OPENING"
              : category,
          tags: parseTags(tags),
          language,
          origin: sourceUrl.trim() ? "imported" : "manual",
          sourceUrl: sourceUrl.trim() || undefined,
          status,
          companyId: isCompany && publishAs === "COMPANY" ? activeCompany?.id : undefined,
          jobDetails: kind === "JOB"
            ? { ...jobDetails, applicationUrl: offerUrl.trim() || jobDetails.applicationUrl }
            : offerUrl.trim()
              ? { applicationUrl: offerUrl.trim() }
              : undefined,
          postKind: kind,
          visibility,
          commentMode: commentsEnabled ? "ANYONE" : "NONE",
          coverImageUrl: coverImageUrl.trim()
            ? toAbsoluteUrl(coverImageUrl.trim()) || undefined
            : undefined,
          media: mediaType
            ? urls.slice(0, kind === "PHOTO" ? 4 : 1).map((url) => ({
                type: mediaType,
                url,
                name: imageAlt || undefined,
              }))
            : undefined,
          poll: kind === "POLL" ? { options: choices.slice(0, 4), durationDays: duration } : undefined,
          event:
            kind === "EVENT"
              ? {
                  startsAt: new Date(eventStartsAt).toISOString(),
                  location: eventLocation.trim() || undefined,
                }
              : undefined,
          celebration: kind === "CELEBRATE" ? { occasion } : undefined,
          scheduledAt: isPostFeatureEnabled("schedule") ? scheduleIso : undefined,
          pinned: isPostFeatureEnabled("pin") ? pinned : undefined,
        },
      ));
      setText("");
      setLinks("");
      setImageAlt("");
      setOfferUrl("");
      setJobDetails({});
      setTags("");
      setPoll(["", ""]);
      setScheduledAt("");
      setPinned(false);
      setUrgentPost(false);
      setEventStartsAt("");
      setEventLocation("");
      setCoverImageUrl("");
      setSourceUrl("");
      setOpen(false);
      onCreated?.(status);
    } catch (err) {
      const message =
        err instanceof Error && /aborted|timeout|Failed to fetch|network/i.test(err.message)
          ? "La publication a expiré — vérifiez la connexion à la base, puis réessayez."
          : err instanceof Error
            ? err.message
            : "Publication impossible.";
      setError(message);
    } finally {
      setLoading(false);
      setAsDraft(false);
    }
  }

  /* ────────────────── trigger card ────────────────── */
  return (
    <>
      <section className="sa-card px-4 pt-3.5 pb-1.5">
        <button
          type="button"
          onClick={() => openWith("TEXT")}
          className="flex w-full items-center gap-2.5 text-left"
        >
          <Avatar
            name={isCompany ? companyDisplayName : displayName}
            initials={(isCompany ? companyDisplayName : displayName)
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
            src={profilePhotoUrl || (isCompany ? activeCompany?.logoUrl ?? null : null)}
            className={cn(
              "size-11 text-[13px] font-bold text-white rounded-full ring-2 ring-[#eff5ff]",
              role === "COMPANY" ? "bg-[var(--sa-ink)]" : "bg-[#2563eb]",
            )}
          />
          <span className="flex h-11 flex-1 items-center rounded-full border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] px-4 text-[13px] text-[var(--sa-text-secondary)] transition-colors hover:border-[#2563eb]/30 hover:bg-white hover:text-[var(--sa-text)]">
            Commencer un post
          </span>
        </button>
        <div className="mt-1 flex flex-wrap justify-around gap-0">
          {triggers
            .filter((item) => ["VIDEO", "PHOTO", "DOCUMENT"].includes(item.id) || (!isCompany && item.id === "CELEBRATE") || (isCompany && item.id === "JOB"))
            .slice(0, 3)
            .map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openWith(item.id)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[13px] font-semibold text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-hover)] hover:text-[#2563eb]"
            >
              <item.icon className={cn("size-5", item.color)} strokeWidth={1.6} />
              <span className="hidden sm:inline">
                {item.id === "DOCUMENT" ? "Rédiger un article" : item.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ─────────────── full modal ─────────────── */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-[var(--sa-modal-backdrop)]"
            onClick={requestClose}
          />
          <div className="sa-modal relative z-10 flex max-h-[100vh] w-full max-w-[var(--sa-composer-max)] flex-col overflow-hidden sm:max-h-[92vh]">

            {/* ── header ── */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--sa-divider)] px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar
                  name={publisherLabel}
                  initials={publisherLabel.slice(0, 2).toUpperCase()}
                  src={profilePhotoUrl || (isCompany && publishAs === "COMPANY" ? activeCompany?.logoUrl ?? null : null)}
                  className={cn(
                    "size-12",
                    isCompany && publishAs === "COMPANY"
                      ? "rounded-[10px] bg-[var(--sa-ink)] text-white"
                      : "",
                  )}
                />
                <div className="min-w-0">
                  {/* ── Publish-as selector (company feature) ── */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompany) setShowPublishAsMenu((v) => !v);
                      }}
                      className="inline-flex max-w-full items-center gap-1 text-[20px] font-semibold leading-7 text-[var(--sa-text)]"
                    >
                      <span className="truncate">
                        {isCompany
                          ? publishAs === "COMPANY"
                            ? `Publier en tant que ${companyDisplayName}`
                            : `Publier en tant que ${displayName}`
                          : `Publier en tant que ${displayName}`}
                      </span>
                      {isCompany && <ChevronDown className="size-5 shrink-0" strokeWidth={1.8} />}
                    </button>

                    {/* ── Publish-as dropdown ── */}
                    {showPublishAsMenu && isCompany && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-[14px] border border-[var(--sa-border)] bg-[var(--sa-card)] p-2 shadow-xl">
                        <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--sa-text-muted)]">
                          Publier en tant que
                        </p>
                        {/* Company option */}
                        <button
                          type="button"
                          onClick={() => {
                            setPublishAs("COMPANY");
                            setShowPublishAsMenu(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition-colors",
                            publishAs === "COMPANY"
                              ? "bg-[var(--sa-action-soft)]"
                              : "hover:bg-[var(--sa-hover)]",
                          )}
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--sa-ink)] text-white">
                            <Building2 className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--sa-text)]">
                              {companyDisplayName}
                            </p>
                            <p className="text-[11px] text-[var(--sa-text-muted)]">
                              Page entreprise · {activeCompany?.city ?? "Tunisie"}
                            </p>
                          </div>
                          {publishAs === "COMPANY" && (
                            <Check className="size-4 text-[var(--sa-action)]" />
                          )}
                        </button>
                        {/* Personal option */}
                        <button
                          type="button"
                          onClick={() => {
                            setPublishAs("PERSONAL");
                            setShowPublishAsMenu(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition-colors",
                            publishAs === "PERSONAL"
                              ? "bg-[var(--sa-action-soft)]"
                              : "hover:bg-[var(--sa-hover)]",
                          )}
                        >
                          <Avatar
                            name={displayName}
                            initials={displayName.slice(0, 2).toUpperCase()}
                            src={profilePhotoUrl}
                            className="size-9"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--sa-text)]">
                              {displayName}
                            </p>
                            <p className="text-[11px] text-[var(--sa-text-muted)]">
                              Compte personnel
                            </p>
                          </div>
                          {publishAs === "PERSONAL" && (
                            <Check className="size-4 text-[var(--sa-action)]" />
                          )}
                        </button>

                        {/* Company selector if multiple companies */}
                        {companies.length > 1 && publishAs === "COMPANY" && (
                          <>
                            <div className="my-2 border-t border-[var(--sa-divider)]" />
                            <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--sa-text-muted)]">
                              Choisir l&apos;entreprise
                            </p>
                            {companies.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCompanyId(c.id);
                                  setShowPublishAsMenu(false);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-sm transition-colors",
                                  effectiveCompanyId === c.id
                                    ? "bg-[var(--sa-action-soft)] font-semibold text-[var(--sa-action)]"
                                    : "text-[var(--sa-text)] hover:bg-[var(--sa-hover)]",
                                )}
                              >
                                <Building2 className="size-3.5" />
                                <span className="truncate">{c.name}</span>
                                {effectiveCompanyId === c.id && (
                                  <Check className="ml-auto size-3.5" />
                                )}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Visibility selector ── */}
                  <div className="relative mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowVisibilityMenu((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--sa-border)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]"
                    >
                      {visibility === "PUBLIC" ? (
                        <Globe2 className="size-3.5" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                      {visibility === "PUBLIC" ? "Tout le monde" : "Membres"}
                      <ChevronDown className="size-3.5" />
                    </button>

                    {/* Language toggle */}
                    <button
                      type="button"
                      onClick={() => setLanguage((l) => (l === "FR" ? "EN" : "FR"))}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--sa-border)] px-2 py-0.5 text-[11px] font-bold text-[var(--sa-text-muted)] hover:bg-[var(--sa-hover)]"
                      title="Langue du post"
                    >
                      {language === "FR" ? "🇫🇷 FR" : "🇬🇧 EN"}
                    </button>

                    {/* Visibility dropdown */}
                    {showVisibilityMenu && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-[12px] border border-[var(--sa-border)] bg-[var(--sa-card)] p-1.5 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setVisibility("PUBLIC");
                            setShowVisibilityMenu(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-sm transition-colors",
                            visibility === "PUBLIC"
                              ? "bg-[var(--sa-action-soft)]"
                              : "hover:bg-[var(--sa-hover)]",
                          )}
                        >
                          <Globe2 className="size-4 text-[var(--sa-action)]" />
                          <div>
                            <p className="font-semibold text-[var(--sa-text)]">Tout le monde</p>
                            <p className="text-[11px] text-[var(--sa-text-muted)]">
                              Visible par tous les utilisateurs
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVisibility("MEMBERS");
                            setShowVisibilityMenu(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-sm transition-colors",
                            visibility === "MEMBERS"
                              ? "bg-[var(--sa-action-soft)]"
                              : "hover:bg-[var(--sa-hover)]",
                          )}
                        >
                          <Lock className="size-4 text-amber-600" />
                          <div>
                            <p className="font-semibold text-[var(--sa-text)]">Membres uniquement</p>
                            <p className="text-[11px] text-[var(--sa-text-muted)]">
                              Réservé aux membres connectés
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fermer la fenêtre"
                onClick={requestClose}
                className="sa-btn-action p-2"
              >
                <X className="size-5" strokeWidth={1.8} />
              </button>
            </div>

            {/* ── company section tabs (only for company) ── */}
            {isCompany && (
              <div className="flex border-b border-[var(--sa-divider)]">
                {(
                  [
                    { id: "content", label: "Contenu", icon: FileText },
                    { id: "media", label: "Médias", icon: ImageIcon },
                    { id: "settings", label: "Options", icon: Zap },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id)}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold transition-colors",
                      activeSection === tab.id
                        ? "border-b-2 border-[var(--sa-action)] text-[var(--sa-action)]"
                        : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-secondary)]",
                    )}
                  >
                    <tab.icon className="size-3.5" strokeWidth={2} />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── scrollable body ── */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {/* ═══ CONTENT TAB ═══ */}
              {(activeSection === "content" || !isCompany) && (
                <>
                  {/* Category chips */}
                  <div>
                    <p className="mb-2 text-[12px] font-semibold text-[var(--sa-text-secondary)]">
                      Catégorie
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categoryChips.map((chip) => {
                        const Icon = COMPANY_CATEGORY_ICONS[chip.value as PostCategory];
                        return (
                          <button
                            key={String(chip.value)}
                            type="button"
                            onClick={() => setCategory(chip.value as PostCategory)}
                            className={cn(
                              "sa-chip inline-flex items-center gap-1.5 border",
                              category === chip.value
                                ? "sa-chip-active border-transparent"
                                : "border-[var(--sa-border)] bg-[var(--sa-card)] text-[var(--sa-text)] hover:bg-[var(--sa-hover)]",
                            )}
                          >
                            {Icon && isCompany && (
                              <Icon className="size-3.5" strokeWidth={1.8} />
                            )}
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Text area with character count */}
                  <div className="relative">
                    {isOfferAnnouncement ? (
                      <p className="mb-2 text-sm font-semibold text-[var(--sa-text)]">
                        Description de l’offre
                      </p>
                    ) : null}
                    <Textarea
                      ref={textAreaRef}
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder={placeholder}
                      aria-label={isOfferAnnouncement ? "Description de l’offre" : undefined}
                      rows={isOfferAnnouncement ? 8 : 5}
                      className={cn(
                        "resize-none border-0 px-0 text-[18px] leading-7 shadow-none focus-visible:ring-0",
                        isOfferAnnouncement ? "min-h-48" : "min-h-28",
                      )}
                    />
                    {charCount > 0 && (
                      <p className={cn(
                        "absolute bottom-2 right-2 text-[11px] tabular-nums",
                        charCount > 3000 ? "text-[var(--sa-danger)]" : "text-[var(--sa-text-muted)]",
                      )}>
                        {charCount.toLocaleString("fr-FR")} caractères
                      </p>
                    )}
                  </div>

                  {showEmoji ? <div className="sa-animate-in">{emojiPanel}</div> : null}

                  {/* Tags with preview */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1">
                        <Hash className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--sa-text-muted)]" />
                        <Input
                          value={tags}
                          onChange={(event) => setTags(event.target.value)}
                          placeholder="Ajouter un tag…"
                          className="h-9 max-w-xs border-[var(--sa-border)] pl-8 text-sm text-[var(--sa-action)]"
                        />
                      </div>
                    </div>
                    {parseTags(tags).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {parseTags(tags).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[var(--sa-action-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--sa-action)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isCompany && publishAs === "COMPANY" && open ? (
                    <section className="rounded-[12px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
                      <label className="block space-y-1.5 text-sm font-semibold text-[var(--sa-text)]">
                        Lien de l’offre
                        <Input
                          type="url"
                          value={offerUrl}
                          onChange={(event) => setOfferUrl(event.target.value)}
                          placeholder="Collez le lien de l’offre ici (https://…)"
                          maxLength={2000}
                          className="h-11 bg-white font-normal"
                        />
                      </label>
                    </section>
                  ) : null}

                  {kind === "JOB" ? (
                    <JobDetailsFields value={jobDetails} onChange={setJobDetails} showApplicationUrl={false} />
                  ) : null}
                </>
              )}

              {/* ═══ MEDIA TAB ═══ */}
              {(activeSection === "media" ||
                !isCompany ||
                kind === "PHOTO" ||
                kind === "VIDEO" ||
                kind === "DOCUMENT") && (
                <>
                  <input
                    ref={mediaInputRef}
                    type="file"
                    accept={
                      kind === "VIDEO"
                        ? "video/mp4,video/webm"
                        : kind === "DOCUMENT"
                          ? "application/pdf"
                          : "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf"
                    }
                    className="hidden"
                    onChange={(e) => void handleMediaFile(e.target.files?.[0])}
                  />

                  {/* Photo / Video section */}
                  {(kind === "PHOTO" || kind === "VIDEO" || (links && kind !== "DOCUMENT")) && (
                    <div className="relative rounded-[8px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
                      <button
                        type="button"
                        className="absolute right-2 top-2 sa-btn-action p-1"
                        onClick={() => {
                          setLinks("");
                          setImageAlt("");
                          if (kind === "PHOTO" || kind === "VIDEO") setKind("TEXT");
                        }}
                        aria-label="Retirer le média"
                      >
                        <X className="size-4" />
                      </button>
                      <p className="text-sm font-semibold text-[var(--sa-text)]">
                        {kind === "VIDEO" ? "Vidéo" : "Image"}
                      </p>
                      <div className="mt-2 flex h-28 items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--sa-border)] bg-[var(--sa-card)] text-[13px] text-[var(--sa-text-muted)]">
                        {links && isUrl(toAbsoluteUrl(links)) && kind !== "VIDEO" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={toAbsoluteUrl(links)}
                            alt={imageAlt || "Aperçu"}
                            className="h-full w-full object-cover"
                          />
                        ) : links ? (
                          <span className="px-3 text-center text-[12px] text-[#2563eb]">
                            Fichier prêt · {links.split("/").pop()}
                          </span>
                        ) : (
                          "Ajoutez une photo ou une vidéo"
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={mediaUploading}
                        onClick={() => mediaInputRef.current?.click()}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
                      >
                        {mediaUploading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        {mediaUploading ? "Envoi…" : "Téléverser un fichier"}
                      </button>
                      <Input
                        value={links}
                        onChange={(event) => setLinks(event.target.value)}
                        placeholder="Ou collez un lien https://…"
                        className="mt-2 h-9"
                      />
                      <label className="mt-2 block text-[12px] font-semibold text-[var(--sa-text-secondary)]">
                        Texte alternatif
                        <Input
                          value={imageAlt}
                          onChange={(event) => setImageAlt(event.target.value)}
                          placeholder="Décrivez l'image"
                          className="mt-1 h-9 font-normal"
                        />
                      </label>
                    </div>
                  )}

                  {/* Document section */}
                  {kind === "DOCUMENT" ? (
                    <div className="relative rounded-[12px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
                      <button
                        type="button"
                        className="absolute right-2 top-2 sa-btn-action p-1"
                        onClick={() => {
                          setLinks("");
                          setKind("TEXT");
                        }}
                        aria-label="Retirer le document"
                      >
                        <X className="size-4" />
                      </button>
                      <p className="text-sm font-semibold text-[var(--sa-text)]">Document</p>
                      <button
                        type="button"
                        disabled={mediaUploading}
                        onClick={() => mediaInputRef.current?.click()}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
                      >
                        {mediaUploading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        {mediaUploading ? "Envoi…" : "Téléverser un PDF"}
                      </button>
                      <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--sa-border)] bg-[var(--sa-card)] px-3 py-2">
                        <FileText className="size-5 text-[#C37D16]" />
                        <Input
                          value={links}
                          onChange={(event) => setLinks(event.target.value)}
                          placeholder="Ou lien du PDF (https://…)"
                          className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Cover image (company extra) */}
                  {isCompany && (
                    <div className="rounded-[12px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sa-text)]">
                        <ImageIcon className="size-4 text-[#3b82f6]" />
                        Image de couverture
                        <span className="text-[11px] font-normal text-[var(--sa-text-muted)]">(optionnel)</span>
                      </p>
                      <Input
                        value={coverImageUrl}
                        onChange={(event) => setCoverImageUrl(event.target.value)}
                        placeholder="https://… URL publique de l'image"
                        className="mt-2 h-9"
                      />
                      {coverImageUrl.trim() && isUrl(coverImageUrl.trim()) && (
                        <div className="mt-2 overflow-hidden rounded-[8px] border border-[var(--sa-border)]">
                          <img
                            src={coverImageUrl.trim()}
                            alt="Aperçu couverture"
                            className="h-28 w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source URL (imported) */}
                  {isCompany && (
                    <div className="rounded-[12px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sa-text)]">
                        <Link2 className="size-4 text-[#8B5CF6]" />
                        Lien source
                        <span className="text-[11px] font-normal text-[var(--sa-text-muted)]">(si importé)</span>
                      </p>
                      <Input
                        value={sourceUrl}
                        onChange={(event) => setSourceUrl(event.target.value)}
                        placeholder="https://… URL de l'article original"
                        className="mt-2 h-9"
                      />
                    </div>
                  )}
                </>
              )}

              {/* ═══ Event section (always visible) ═══ */}
              {kind === "EVENT" ? (
                <div className="rounded-[12px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3 space-y-2">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sa-text)]">
                    <CalendarDays className="size-4 text-[#2563eb]" />
                    Événement
                  </p>
                  <Input
                    type="datetime-local"
                    value={eventStartsAt}
                    onChange={(event) => setEventStartsAt(event.target.value)}
                    className="h-10"
                  />
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--sa-text-muted)]" />
                    <Input
                      value={eventLocation}
                      onChange={(event) => setEventLocation(event.target.value)}
                      placeholder="Lieu (optionnel)"
                      className="h-10 pl-8"
                    />
                  </div>
                </div>
              ) : null}

              {/* ═══ Celebrate section ═══ */}
              {kind === "CELEBRATE" ? (
                <div className="rounded-[12px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sa-text)]">
                    <PartyPopper className="size-4 text-amber-500" />
                    Occasion
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CELEBRATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOccasion(opt.value)}
                        className={cn(
                          "rounded-[10px] border px-3 py-2 text-sm font-semibold transition-colors",
                          occasion === opt.value
                            ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
                            : "border-[var(--sa-border)] bg-[var(--sa-card)] text-[var(--sa-text)] hover:bg-[var(--sa-hover)]",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* ═══ Poll section ═══ */}
              {kind === "POLL" ? (
                <div className="relative rounded-[8px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sa-text)]">
                      <BarChart3 className="size-4 text-[#E16745]" />
                      Sondage
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--sa-border)] px-2 py-0.5 text-[12px] font-semibold text-[var(--sa-action)] hover:bg-[var(--sa-hover)]"
                      onClick={() =>
                        setDuration((value) => (value === 7 ? 14 : value === 14 ? 3 : value === 3 ? 1 : 7))
                      }
                    >
                      <Clock className="size-3" />
                      {duration === 7
                        ? "1 semaine"
                        : duration === 14
                          ? "2 semaines"
                          : duration === 3
                            ? "3 jours"
                            : "1 jour"}
                    </button>
                  </div>
                  {poll.map((choice, index) => (
                    <Input
                      key={index}
                      value={choice}
                      placeholder={index === 0 ? "Option 1" : `Option ${index + 1}`}
                      className="mt-2 h-10 bg-[var(--sa-card)]"
                      onChange={(event) =>
                        setPoll((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        )
                      }
                    />
                  ))}
                  {poll.length < 4 ? (
                    <button
                      type="button"
                      className="mt-2 w-full rounded-md border border-dashed border-[var(--sa-border)] bg-[var(--sa-card)] px-3 py-2.5 text-sm font-semibold text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)]"
                      onClick={() => setPoll((current) => [...current, ""])}
                    >
                      + Ajouter une option
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* ═══ SETTINGS TAB (company enhanced) ═══ */}
              {(activeSection === "settings" || !isCompany) && (
                <div className={cn(
                  "space-y-3",
                  isCompany && "rounded-[14px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-4",
                )}>
                  {isCompany && (
                    <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-[var(--sa-text-muted)]">
                      Options de publication
                    </p>
                  )}

                  {/* Comments toggle */}
                  <button
                    type="button"
                    onClick={() => setCommentsEnabled((v) => !v)}
                    className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-[var(--sa-hover)]"
                  >
                    <div className={cn(
                      "flex size-8 items-center justify-center rounded-[8px]",
                      commentsEnabled ? "bg-[var(--sa-action-soft)] text-[var(--sa-action)]" : "bg-[var(--sa-surface-soft)] text-[var(--sa-text-muted)]",
                    )}>
                      <MessageSquareText className="size-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--sa-text)]">Commentaires</p>
                      <p className="text-[11px] text-[var(--sa-text-muted)]">
                        {commentsEnabled ? "Tout le monde peut commenter" : "Commentaires désactivés"}
                      </p>
                    </div>
                    <div className={cn(
                      "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                      commentsEnabled ? "bg-[var(--sa-action)]" : "bg-[var(--sa-border)]",
                    )}>
                      <div className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                        commentsEnabled ? "translate-x-4" : "translate-x-0.5",
                      )} />
                    </div>
                  </button>

                  {/* Pin toggle */}
                  {isPostFeatureEnabled("pin") ? (
                    <button
                      type="button"
                      onClick={() => setPinned((v) => !v)}
                      className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-[var(--sa-hover)]"
                    >
                      <div className={cn(
                        "flex size-8 items-center justify-center rounded-[8px]",
                        pinned ? "bg-amber-100 text-amber-600" : "bg-[var(--sa-surface-soft)] text-[var(--sa-text-muted)]",
                      )}>
                        <Pin className="size-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--sa-text)]">Épingler</p>
                        <p className="text-[11px] text-[var(--sa-text-muted)]">
                          Afficher en haut du fil
                        </p>
                      </div>
                      <div className={cn(
                        "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                        pinned ? "bg-amber-500" : "bg-[var(--sa-border)]",
                      )}>
                        <div className={cn(
                          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                          pinned ? "translate-x-4" : "translate-x-0.5",
                        )} />
                      </div>
                    </button>
                  ) : null}

                  {/* Urgent post (company feature) */}
                  {isCompany && (
                    <button
                      type="button"
                      onClick={() => setUrgentPost((v) => !v)}
                      className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors hover:bg-[var(--sa-hover)]"
                    >
                      <div className={cn(
                        "flex size-8 items-center justify-center rounded-[8px]",
                        urgentPost ? "bg-red-100 text-red-600" : "bg-[var(--sa-surface-soft)] text-[var(--sa-text-muted)]",
                      )}>
                        <Zap className="size-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--sa-text)]">Urgent</p>
                        <p className="text-[11px] text-[var(--sa-text-muted)]">
                          Marquer comme prioritaire
                        </p>
                      </div>
                      <div className={cn(
                        "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                        urgentPost ? "bg-red-500" : "bg-[var(--sa-border)]",
                      )}>
                        <div className={cn(
                          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                          urgentPost ? "translate-x-4" : "translate-x-0.5",
                        )} />
                      </div>
                    </button>
                  )}

                  {/* Schedule */}
                  {isPostFeatureEnabled("schedule") ? (
                    <div className="rounded-[10px] px-2 py-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex size-8 items-center justify-center rounded-[8px]",
                          scheduledAt ? "bg-blue-100 text-blue-600" : "bg-[var(--sa-surface-soft)] text-[var(--sa-text-muted)]",
                        )}>
                          <CalendarDays className="size-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[var(--sa-text)]">Programmer</p>
                          <p className="text-[11px] text-[var(--sa-text-muted)]">
                            Choisir une date et heure de publication
                          </p>
                        </div>
                      </div>
                      <Input
                        ref={scheduleInputRef}
                        id="sa-schedule-input"
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(event) => setScheduledAt(event.target.value)}
                        className="mt-2 ml-11 h-9 max-w-xs"
                      />
                    </div>
                  ) : null}

                  {/* Preview summary */}
                  {isCompany && text.trim() && (
                    <div className="mt-2 rounded-[10px] border border-dashed border-[var(--sa-action)]/30 bg-[var(--sa-action-soft)]/30 px-3 py-2.5">
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--sa-action)]">
                        <Eye className="size-3" />
                        Aperçu de la publication
                      </p>
                      <p className="text-[12px] leading-5 text-[var(--sa-text-secondary)]">
                        <strong>{publisherLabel}</strong> publiera{" "}
                        {POST_KIND_LABELS[kind] === "Publication" ? "un post" : `un(e) ${POST_KIND_LABELS[kind].toLowerCase()}`}
                        {" "}dans la catégorie{" "}
                        <strong>{categoryChips.find((c) => c.value === category)?.label}</strong>
                        {visibility === "MEMBERS" && " · visible uniquement par les membres"}
                        {scheduledAt && (
                          <>
                            {" · programmé pour le "}
                            <strong>
                              {new Date(scheduledAt).toLocaleString("fr-FR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </strong>
                          </>
                        )}
                        {offerUrl.trim() ? <> · lien de l’offre ajouté</> : null}
                        .
                      </p>
                    </div>
                  )}

                  {isPostFeatureEnabled("mentions") ? (
                    <p className="px-2 text-[12px] text-[var(--sa-text-secondary)]">
                      <AtSign className="mb-0.5 inline size-3" />{" "}
                      Tapez @pseudo dans le texte pour mentionner quelqu&apos;un.
                    </p>
                  ) : null}
                </div>
              )}

              {error ? <p className="text-sm text-[var(--sa-danger)]">{error}</p> : null}
            </div>

            {/* ── footer toolbar ── */}
            <div className="relative shrink-0 border-t border-[var(--sa-divider)] bg-white px-4 py-3">
              {showEmoji && isCompany && activeSection !== "content" ? (
                <div className="mb-3 sa-animate-in">{emojiPanel}</div>
              ) : null}

              {showSchedulePicker || (isPostFeatureEnabled("schedule") && scheduledAt) ? (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] px-3 py-2">
                  <CalendarDays className="size-4 text-[#2563eb]" />
                  <span className="text-[12px] font-semibold text-[var(--sa-text-secondary)]">
                    Publication programmée
                  </span>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="h-9 max-w-[220px] bg-white"
                  />
                  {scheduledAt ? (
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-[var(--sa-text-muted)] hover:text-[var(--sa-danger)]"
                      onClick={() => {
                        setScheduledAt("");
                        setShowSchedulePicker(false);
                      }}
                    >
                      Effacer
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-0.5">
                  {(
                    [
                      { id: "EMOJI" as const, icon: Smile, label: "Emoji", color: "text-[var(--sa-text-muted)]" },
                      { id: "PHOTO" as const, icon: ImageIcon, label: "Photo", color: "text-[#3b82f6]" },
                      { id: "VIDEO" as const, icon: Video, label: "Vidéo", color: "text-[#8B5CF6]" },
                      { id: "DOCUMENT" as const, icon: FileText, label: "Document", color: "text-[#C37D16]" },
                      { id: "POLL" as const, icon: BarChart3, label: "Sondage", color: "text-[#E16745]" },
                      { id: "EVENT" as const, icon: CalendarDays, label: "Événement", color: "text-[#2563eb]" },
                      { id: "JOB" as const, icon: Briefcase, label: "Offre", color: "text-[#2563eb]" },
                    ] as const
                  )
                    .filter((item) => !(role === "CANDIDATE" && item.id === "JOB"))
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        onClick={() => activateToolbar(item.id)}
                        className={cn(
                          "sa-btn-action inline-flex size-10 items-center justify-center",
                          (item.id === "EMOJI" ? showEmoji : kind === item.id) &&
                            "bg-[var(--sa-action-soft)] text-[var(--sa-action)]",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-5",
                            !(item.id === "EMOJI" ? showEmoji : kind === item.id) && item.color,
                          )}
                          strokeWidth={1.8}
                        />
                      </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={loading || !text.trim()}
                    onClick={() => void publish("DRAFT")}
                    className="px-3 py-2 text-sm font-semibold text-[var(--sa-text-secondary)] hover:text-[var(--sa-text)] disabled:opacity-40"
                  >
                    {loading && asDraft ? "…" : "Brouillon"}
                  </button>
                  {isPostFeatureEnabled("schedule") && (
                    <button
                      type="button"
                      disabled={loading || (Boolean(scheduledAt) && !text.trim())}
                      onClick={() => {
                        if (!scheduledAt) {
                          setShowSchedulePicker(true);
                          if (isCompany) setActiveSection("settings");
                          window.setTimeout(() => {
                            scheduleInputRef.current?.focus();
                            document.getElementById("sa-schedule-input")?.scrollIntoView({
                              behavior: "smooth",
                              block: "nearest",
                            });
                          }, 50);
                          return;
                        }
                        void publish("PUBLISHED");
                      }}
                      className="sa-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm disabled:opacity-40"
                      title={
                        scheduledAt
                          ? "Publier à la date programmée"
                          : "Choisir une date de publication"
                      }
                    >
                      <CalendarDays className="size-4" />
                      {scheduledAt ? "Programmer" : "Choisir date"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={loading || !text.trim()}
                    onClick={() => {
                      setScheduledAt("");
                      setShowSchedulePicker(false);
                      void publish("PUBLISHED");
                    }}
                    className="sa-btn-primary px-5 py-2 disabled:opacity-40"
                  >
                    {loading && !asDraft ? "Publication…" : "Publier"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
