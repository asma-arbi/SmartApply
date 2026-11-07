import { plainText } from "@/lib/rich-text";
import { ConflictError, UnverifiedCompanyError, ValidationError } from "@/server/lib/errors";

export type PostSource = "MANUAL" | "IMPORTED";
export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "REMOVED";

const TAG_MAX = 12;
const TAG_LEN = 40;

export function normalizeTags(tags: string[] | undefined | null): string[] {
  if (!tags?.length) return [];
  const out = new Set<string>();
  for (const raw of tags) {
    const tag = raw
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, TAG_LEN);
    if (tag.length >= 2) out.add(tag);
    if (out.size >= TAG_MAX) break;
  }
  return [...out];
}

export function excerptFrom(body: string, max = 240): string {
  const text = plainText(body);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function assertNoExistingReport(alreadyReported: boolean) {
  if (alreadyReported) {
    throw new ConflictError("Vous avez déjà signalé cette publication.");
  }
}

export function assertImportedSource(source: PostSource, sourceUrl?: string | null): void {
  if (source === "IMPORTED" && !sourceUrl?.trim()) {
    throw new ValidationError(
      "Un contenu importé doit exposer un lien source visible (sourceUrl).",
      { field: "sourceUrl" },
    );
  }
}

export const POST_KINDS = [
  "TEXT",
  "PHOTO",
  "VIDEO",
  "DOCUMENT",
  "POLL",
  "EVENT",
  "CELEBRATE",
  "ARTICLE",
  "JOB",
] as const;

export type PostKind = (typeof POST_KINDS)[number];

export const JOB_CATEGORIES = [
  "JOB_OPENING",
  "INTERNSHIP_ANNOUNCEMENT",
  "PFE_ANNOUNCEMENT",
  "SCHOLARSHIP",
] as const;

export const CELEBRATIONS = [
  "NEW_JOB",
  "GRADUATION",
  "PROMOTION",
  "PROJECT",
  "CERTIFICATE",
  "ANNIVERSARY",
] as const;

export type CelebrationOccasion = (typeof CELEBRATIONS)[number];

export type StoredMedia = { type: "image" | "video" | "document"; url: string; name?: string };
export type StoredPoll = { options: string[]; closesAt: string };
export type StoredEvent = { startsAt: string; location?: string; link?: string };
export type StoredCelebration = { occasion: CelebrationOccasion };

const KIND_MEDIA: Partial<Record<PostKind, StoredMedia["type"]>> = {
  PHOTO: "image",
  VIDEO: "video",
  DOCUMENT: "document",
};

export function categoryForKind(kind: PostKind, role: string, category?: string) {
  if (kind === "JOB") {
    return JOB_CATEGORIES.includes(category as (typeof JOB_CATEGORIES)[number])
      ? category!
      : "JOB_OPENING";
  }
  if (kind === "EVENT") return category && category !== "JOB_OPENING" ? category : "OPEN_DAY";
  if (kind === "CELEBRATE") return "TESTIMONIAL";
  if (kind === "ARTICLE") return role === "COMPANY" ? "COMPANY_ANNOUNCEMENT" : "CAREER_ADVICE";
  if (category) return category;
  return role === "COMPANY" ? "COMPANY_ANNOUNCEMENT" : "CAREER_ADVICE";
}

export function preparePublication(input: {
  role: string;
  postKind?: string;
  category?: string;
  visibility?: string;
  commentMode?: string;
  media?: StoredMedia[];
  poll?: { options: string[]; durationDays?: number };
  event?: StoredEvent;
  celebration?: StoredCelebration;
}) {
  const postKind = (POST_KINDS as readonly string[]).includes(input.postKind ?? "")
    ? (input.postKind as PostKind)
    : "TEXT";
  if (postKind === "JOB" && input.role === "CANDIDATE") {
    throw new ValidationError("Seul un compte entreprise peut publier une offre.");
  }
  const visibility = input.visibility === "MEMBERS" ? "MEMBERS" : "PUBLIC";
  const commentMode = input.commentMode === "NONE" ? "NONE" : "ANYONE";
  const expected = KIND_MEDIA[postKind];
  const media = expected
    ? (input.media ?? []).filter((item) => item.type === expected).slice(0, postKind === "PHOTO" ? 4 : 1)
    : [];
  if (expected && media.length === 0) {
    throw new ValidationError("Ajoutez un lien public pour cette publication.", { field: "media" });
  }
  let poll: StoredPoll | null = null;
  if (postKind === "POLL") {
    const options = (input.poll?.options ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 4);
    if (options.length < 2) throw new ValidationError("Un sondage contient au moins deux choix.");
    const days = input.poll?.durationDays ?? 7;
    const closesAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    poll = { options, closesAt };
  }
  const event = postKind === "EVENT" ? input.event ?? null : null;
  if (postKind === "EVENT" && !event?.startsAt) {
    throw new ValidationError("Indiquez la date de l’événement.");
  }
  const celebration = postKind === "CELEBRATE" ? input.celebration ?? null : null;
  if (postKind === "CELEBRATE" && !celebration?.occasion) {
    throw new ValidationError("Choisissez une occasion à célébrer.");
  }
  return {
    postKind,
    visibility,
    commentMode,
    media,
    poll,
    event,
    celebration,
    category: categoryForKind(postKind, input.role, input.category),
    // Company ownership and job association are enforced by the posts service.
    requiresCompany: false,
  };
}

export function readMedia(value: unknown): StoredMedia[] {
  if (!Array.isArray(value)) return [];
  const media: StoredMedia[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const type = (item as { type?: unknown }).type;
    const url = (item as { url?: unknown }).url;
    const name = (item as { name?: unknown }).name;
    if ((type !== "image" && type !== "video" && type !== "document") || typeof url !== "string") continue;
    media.push({ type, url, name: typeof name === "string" ? name : undefined });
  }
  return media;
}

export function readEvent(value: unknown): StoredEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const startsAt = (value as { startsAt?: unknown }).startsAt;
  if (typeof startsAt !== "string" || !startsAt) return null;
  const location = (value as { location?: unknown }).location;
  const link = (value as { link?: unknown }).link;
  return {
    startsAt,
    location: typeof location === "string" ? location : undefined,
    link: typeof link === "string" ? link : undefined,
  };
}

export function readCelebration(value: unknown): StoredCelebration | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const occasion = (value as { occasion?: unknown }).occasion;
  if (!(CELEBRATIONS as readonly string[]).includes(String(occasion))) return null;
  return { occasion: occasion as CelebrationOccasion };
}

export function readPoll(value: unknown): StoredPoll | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const options = (value as { options?: unknown }).options;
  const closesAt = (value as { closesAt?: unknown }).closesAt;
  if (!Array.isArray(options) || typeof closesAt !== "string") return null;
  const clean = options.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (clean.length < 2) return null;
  return { options: clean, closesAt };
}

export function assertCompanyCanPublish(company: { isClaimed: boolean; isVerified: boolean }): void {
  if (!company.isClaimed || !company.isVerified) {
    throw new UnverifiedCompanyError();
  }
}

export function isPubliclyVisible(status: PostStatus, deletedAt: Date | null): boolean {
  return status === "PUBLISHED" && deletedAt == null;
}

export function publicPostWhere() {
  return {
    status: "PUBLISHED" as const,
    deletedAt: null,
    // Scheduled posts keep status PUBLISHED with future publishedAt until due
    publishedAt: { lte: new Date() },
  };
}

