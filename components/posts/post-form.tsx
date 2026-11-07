"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Bold,
  Briefcase,
  GraduationCap,
  ImageIcon,
  Italic,
  Link2,
  Tags,
  UserRound,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { jobForCompany, useMyCompany } from "@/hooks/use-catalog";
import type { JobDetails, PostCategory, PostInput, PostKind, PostStatus } from "@/types/post";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { JobDetailsFields } from "@/components/posts/job-details-fields";

const TITLE_MIN = 3;
const TITLE_MAX = 200;
const BODY_MIN = 10;
const BODY_MAX = 20_000;

const CANDIDATE_CATEGORIES: PostCategory[] = [
  "CAREER_ADVICE",
  "TESTIMONIAL",
  "CAMPUS_NEWS",
  "WORKSHOP",
  "RECRUITMENT_NEWS",
];

const COMPANY_CATEGORIES: PostCategory[] = [
  "COMPANY_ANNOUNCEMENT",
  "JOB_OPENING",
  "INTERNSHIP_ANNOUNCEMENT",
  "PFE_ANNOUNCEMENT",
  "OPEN_DAY",
  "RECRUITMENT_NEWS",
  "CAREER_ADVICE",
  "WORKSHOP",
  "COMPANY_LIFE",
  "TESTIMONIAL",
  "SCHOLARSHIP",
  "CAMPUS_NEWS",
];

const KIND_OPTIONS: { id: PostKind; label: string; companyOnly?: boolean }[] = [
  { id: "TEXT", label: "Texte" },
  { id: "PHOTO", label: "Photo" },
  { id: "DOCUMENT", label: "Document" },
  { id: "POLL", label: "Sondage" },
  { id: "EVENT", label: "Événement" },
  { id: "CELEBRATE", label: "Célébration" },
  { id: "JOB", label: "Offre liée", companyOnly: true },
];

type PostFormProps = {
  initial?: Partial<PostInput>;
  onSubmit: (input: PostInput) => Promise<void> | void;
  onCancel: () => void;
};

function looksLikeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sourceNameFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseTags(raw: string) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const tag = part
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (!tag || tag.length < 2 || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 12) break;
  }
  return tags;
}

export function PostForm({ initial, onSubmit, onCancel }: PostFormProps) {
  const { user } = useAuth();
  const role = user?.role ?? "CANDIDATE";
  const isCompany = role === "COMPANY" || role === "ADMIN";
  const { company } = useMyCompany(initial?.companyId);

  const allowedCategories = isCompany ? COMPANY_CATEGORIES : CANDIDATE_CATEGORIES;
  const defaultCategory: PostCategory = isCompany
    ? "COMPANY_ANNOUNCEMENT"
    : "CAREER_ADVICE";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState<PostCategory>(
    initial?.category && allowedCategories.includes(initial.category)
      ? initial.category
      : defaultCategory,
  );
  const [postKind, setPostKind] = useState<PostKind>(initial?.postKind ?? "TEXT");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [mediaUrl, setMediaUrl] = useState(initial?.media?.[0]?.url ?? "");
  const [jobDetails, setJobDetails] = useState<JobDetails>(initial?.jobDetails ?? {});
  const [pollA, setPollA] = useState("");
  const [pollB, setPollB] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState(initial?.event?.startsAt?.slice(0, 16) ?? "");
  const [eventLocation, setEventLocation] = useState(initial?.event?.location ?? "");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function wrapSelection(tag: "strong" | "em") {
    const node = contentRef.current;
    const start = node?.selectionStart ?? content.length;
    const end = node?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || "texte";
    setContent(`${content.slice(0, start)}<${tag}>${selected}</${tag}>${content.slice(end)}`);
  }

  const job = useMemo(
    () => (isCompany ? jobForCompany(company, initial?.jobId, category) : null),
    [category, company, initial?.jobId, isCompany],
  );
  const jobId = job?.id ?? "";
  const imported = looksLikeUrl(sourceUrl);
  const parsedTags = parseTags(tags);
  const bodyLeft = Math.max(0, BODY_MIN - content.trim().length);

  const categoryOptions = CATEGORIES.filter(
    (item) => item.value !== "tous" && allowedCategories.includes(item.value as PostCategory),
  );

  function collect(status: PostStatus): PostInput | null {
    if (title.trim().length < TITLE_MIN) {
      setError(`Titre trop court (${TITLE_MIN} caractères minimum).`);
      return null;
    }
    if (content.trim().length < BODY_MIN) {
      setError(`Texte trop court (${BODY_MIN} caractères minimum).`);
      return null;
    }
    if (sourceUrl.trim() && !imported) {
      setError("Le lien source doit commencer par http:// ou https://.");
      return null;
    }
    if (coverImageUrl.trim() && !looksLikeUrl(coverImageUrl.trim())) {
      setError("L’image de couverture doit être un lien http ou https.");
      return null;
    }
    if ((postKind === "PHOTO" || postKind === "DOCUMENT" || postKind === "VIDEO") && !mediaUrl.trim()) {
      setError("Ajoutez le lien du média.");
      return null;
    }
    if (mediaUrl.trim() && !looksLikeUrl(mediaUrl.trim())) {
      setError("Le média doit être un lien http ou https.");
      return null;
    }
    if (postKind === "POLL" && (!pollA.trim() || !pollB.trim())) {
      setError("Un sondage nécessite au moins deux options.");
      return null;
    }
    if (postKind === "EVENT" && !eventStartsAt.trim()) {
      setError("Indiquez la date de l’événement.");
      return null;
    }
    if (postKind === "JOB" && !isCompany) {
      setError("Seul un compte entreprise peut lier une offre.");
      return null;
    }

    const mediaType =
      postKind === "PHOTO" ? "image" : postKind === "VIDEO" ? "video" : postKind === "DOCUMENT" ? "document" : null;

    setError("");
    return {
      title: title.trim(),
      content: content.trim(),
      category,
      language: "FR",
      tags: parsedTags,
      companyId: isCompany ? company?.id : undefined,
      jobId: isCompany && postKind === "JOB" ? jobId || undefined : undefined,
      origin: imported ? "imported" : "manual",
      sourceUrl: imported ? sourceUrl.trim() : undefined,
      sourceLabel: imported ? sourceNameFromUrl(sourceUrl) : undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      status,
      postKind,
      visibility: "PUBLIC",
      commentMode: "ANYONE",
      media: mediaType
        ? [{ type: mediaType, url: mediaUrl.trim() }]
        : coverImageUrl.trim()
          ? [{ type: "image", url: coverImageUrl.trim() }]
          : undefined,
      poll:
        postKind === "POLL"
          ? { options: [pollA.trim(), pollB.trim()], durationDays: 7 }
          : undefined,
      event:
        postKind === "EVENT"
          ? {
              startsAt: new Date(eventStartsAt).toISOString(),
              location: eventLocation.trim() || undefined,
            }
          : undefined,
      celebration: postKind === "CELEBRATE" ? { occasion: "GRADUATION" } : undefined,
      jobDetails: postKind === "JOB" ? jobDetails : undefined,
    };
  }

  async function submit(status: PostStatus) {
    const input = collect(status);
    if (!input) return;
    setLoading(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit("PUBLISHED");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-[var(--sa-border)] bg-[var(--sa-card)]">
        <div
          className="flex items-start gap-3 px-4 py-3 sm:px-5"
          style={{
            background: "linear-gradient(90deg, var(--sa-action-soft), transparent)",
          }}
        >
          <div
            className={cn(
              "mt-0.5 flex size-10 items-center justify-center text-[var(--sa-action)]",
              isCompany ? "rounded-[10px] bg-white/80" : "rounded-full bg-white/80",
            )}
          >
            {isCompany ? <Briefcase className="size-5" /> : <UserRound className="size-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--sa-text)]">
              {isCompany ? company?.name ?? "Espace entreprise" : "Publication candidat"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--sa-text-secondary)]">
              {user?.email ?? "Compte connecté"}
              {isCompany && company ? ` · ${company.city}` : " · visible sur le fil carrière"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--sa-divider)] px-4 py-2.5 sm:px-5">
          <Badge variant="muted">{isCompany ? "Entreprise" : "Candidat"}</Badge>
          {isCompany ? (
            <Badge variant={company?.isVerified ? "success" : "warning"}>
              {company?.isVerified ? "Profil entreprise" : "Sans catalogue (OK)"}
            </Badge>
          ) : (
            <Badge variant="success">
              <GraduationCap className="mr-1 size-3" />
              Conseils & témoignages
            </Badge>
          )}
          {imported ? (
            <Badge variant="muted">Importé · {sourceNameFromUrl(sourceUrl)}</Badge>
          ) : (
            <Badge variant="muted">Manuel</Badge>
          )}
        </div>
      </div>

      <FormSection title="Type de publication" subtitle="Choisissez le format de votre publication">
        <div className="flex flex-wrap gap-2">
          {KIND_OPTIONS.filter((item) => !(item.companyOnly && !isCompany)).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPostKind(item.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                postKind === item.id
                  ? "border-transparent bg-[var(--sa-action)] text-white"
                  : "border-[var(--sa-border)] bg-[var(--sa-card)] text-[var(--sa-text)] hover:bg-[var(--sa-hover)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title="Contenu" subtitle="Ce qui apparaîtra sur le fil">
        <Field id="title" label="Titre" required counter={`${title.trim().length}/${TITLE_MAX}`}>
          <Input
            id="title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              isCompany
                ? "Ex. Stage React — printemps 2026"
                : "Ex. Comment préparer un entretien PFE"
            }
            className="h-11 rounded-xl text-base"
          />
        </Field>

        <Field
          id="content"
          label="Texte"
          required
          counter={`${content.trim().length}/${BODY_MAX}`}
          hint={
            bodyLeft > 0 && content.trim().length > 0
              ? `Encore ${bodyLeft} caractères minimum.`
              : undefined
          }
        >
          <div className="overflow-hidden rounded-xl border border-[var(--sa-border)] bg-[var(--sa-card)] focus-within:ring-2 focus-within:ring-[var(--sa-action)]/25">
            <div className="flex gap-1 border-b border-[var(--sa-divider)] bg-muted/40 px-2 py-1.5">
              <ToolbarButton
                label="Gras"
                onClick={() => wrapSelection("strong")}
                icon={<Bold className="size-3.5" />}
              />
              <ToolbarButton
                label="Italique"
                onClick={() => wrapSelection("em")}
                icon={<Italic className="size-3.5" />}
              />
            </div>
            <Textarea
              id="content"
              ref={contentRef}
              value={content}
              maxLength={BODY_MAX}
              onChange={(event) => setContent(event.target.value)}
              placeholder={
                isCompany
                  ? "Présentez l’opportunité, le lieu, les compétences…"
                  : "Partagez un conseil, un retour d’expérience, une ressource utile…"
              }
              className="min-h-44 resize-y rounded-none border-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </Field>
      </FormSection>

      <FormSection title="Catégorie" subtitle="Aide à filtrer le fil">
        <div className="grid gap-2 sm:grid-cols-2">
          {categoryOptions.map((item) => {
            const active = category === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value as PostCategory)}
                className={cn(
                  "rounded-xl border px-3.5 py-3 text-left transition-all",
                  active
                    ? "border-[var(--sa-action)] bg-[var(--sa-action-soft)] shadow-[0_0_0_1px_var(--sa-action)]"
                    : "border-[var(--sa-border)] bg-[var(--sa-card)] hover:border-[var(--sa-action)]/40 hover:bg-[var(--sa-hover)]",
                )}
              >
                <p className="text-sm font-semibold text-[var(--sa-text)]">{item.label}</p>
                {item.hint ? (
                  <p className="mt-0.5 text-xs leading-5 text-[var(--sa-text-secondary)]">
                    {item.hint}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </FormSection>

      {(postKind === "PHOTO" || postKind === "DOCUMENT" || postKind === "VIDEO") && (
        <FormSection title="Média" subtitle="Ajoutez un lien public vers votre fichier">
          <Field id="media" label="URL du fichier" required>
            <Input
              id="media"
              type="url"
              value={mediaUrl}
              onChange={(event) => setMediaUrl(event.target.value)}
              placeholder="https://…"
              className="h-11 rounded-xl"
            />
          </Field>
        </FormSection>
      )}

      {postKind === "POLL" ? (
        <FormSection title="Sondage" subtitle="Deux options minimum">
          <Input
            value={pollA}
            onChange={(event) => setPollA(event.target.value)}
            placeholder="Option 1"
            className="h-11 rounded-xl"
          />
          <Input
            value={pollB}
            onChange={(event) => setPollB(event.target.value)}
            placeholder="Option 2"
            className="h-11 rounded-xl"
          />
        </FormSection>
      ) : null}

      {postKind === "EVENT" ? (
        <FormSection title="Événement">
          <Input
            type="datetime-local"
            value={eventStartsAt}
            onChange={(event) => setEventStartsAt(event.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            value={eventLocation}
            onChange={(event) => setEventLocation(event.target.value)}
            placeholder="Lieu (optionnel)"
            className="h-11 rounded-xl"
          />
        </FormSection>
      ) : null}

      {postKind === "JOB" ? (
        <JobDetailsFields value={jobDetails} onChange={setJobDetails} />
      ) : null}

      <FormSection title="Médias & provenance" subtitle="Optionnel">
        <Field id="cover" label="Image de couverture" hint="URL publique (https://…)">
          <div className="relative">
            <ImageIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cover"
              type="url"
              value={coverImageUrl}
              onChange={(event) => setCoverImageUrl(event.target.value)}
              placeholder="https://…"
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </Field>

        <Field id="sourceUrl" label="Lien source (si importé)">
          <div className="relative">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="sourceUrl"
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://…"
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </Field>

        <Field id="tags" label="Tags" hint="Séparés par une virgule">
          <div className="relative">
            <Tags className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={isCompany ? "tunis, stage, pfe" : "entretien, conseil, campus"}
              className="h-11 rounded-xl pl-10"
            />
          </div>
          {parsedTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--sa-action-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--sa-action)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </Field>
      </FormSection>

      {error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 border-t border-[var(--sa-divider)] bg-[var(--sa-card)]/95 px-1 pt-4 pb-1 backdrop-blur">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--sa-text-muted)]">
            {isCompany
              ? "Visible sur le fil candidat dès la publication."
              : "Votre post candidat sera visible sur le fil après publication."}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="rounded-[var(--sa-radius-pill)]"
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => void submit("DRAFT")}
              className="rounded-[var(--sa-radius-pill)]"
            >
              Brouillon
            </Button>
            <Button type="submit" disabled={loading} className="rounded-[var(--sa-radius-pill)] px-6">
              {loading ? "Enregistrement…" : "Publier"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-[var(--sa-border)] bg-[var(--sa-card)] p-4 sm:p-5">
      <header>
        <h2 className="text-sm font-semibold tracking-tight text-[var(--sa-text)]">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-[var(--sa-text-secondary)]">{subtitle}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ToolbarButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-card)] hover:text-[var(--sa-text)]"
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  counter,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-[var(--sa-text)]">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </label>
        {counter ? (
          <span className="text-[11px] tabular-nums text-[var(--sa-text-muted)]">{counter}</span>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-xs text-[var(--sa-text-secondary)]">{hint}</p> : null}
    </div>
  );
}

