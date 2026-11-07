"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { plainText, sanitizePostContent } from "@/lib/rich-text";
import { CalendarDays, Globe2, Lock, MapPin, PartyPopper } from "lucide-react";
import { CELEBRATION_OPTIONS, POST_KIND_LABELS } from "@/lib/constants";
import { votePollAction } from "@/server/actions/posts.actions";
import type { PollResults, Post } from "@/types/post";
import { cn } from "@/lib/utils";

function celebrationLabel(post: Post) {
  return CELEBRATION_OPTIONS.find((item) => item.value === post.celebration?.occasion)?.label;
}

export function PostMeta({ post }: { post: Post }) {
  const kind = POST_KIND_LABELS[post.postKind ?? "TEXT"] ?? "Publication";
  return (
    <>
      <span className="inline-flex items-center gap-1">
        {post.visibility === "MEMBERS" ? <Lock className="size-3" /> : <Globe2 className="size-3" />}
        {post.visibility === "MEMBERS" ? "Membres" : "Tout le monde"}
      </span>
      {post.postKind !== "TEXT" ? (
        <>
          <span aria-hidden>·</span>
          <span>{kind}</span>
        </>
      ) : null}
    </>
  );
}

export function JobDetailsSummary({ post }: { post: Post }) {
  const details = post.jobDetails;
  if (!details || (post.postKind !== "JOB" && !details.applicationUrl)) return null;
  const contractLabels = {
    CDI: "CDI", CDD: "CDD", STAGE: "Stage", ALTERNANCE: "Alternance", FREELANCE: "Freelance", PFE: "PFE",
  };
  const contract = details.contractType ? contractLabels[details.contractType] : undefined;
  const levelLabels = {
    ENTRY: "Débutant", JUNIOR: "Junior", MID: "Confirmé", SENIOR: "Senior", LEAD: "Lead",
  };
  const level = details.seniority ? levelLabels[details.seniority] : undefined;
  const modeLabels = { ONSITE: "Sur site", HYBRID: "Hybride", REMOTE: "À distance" };
  const mode = details.workMode ? modeLabels[details.workMode] : undefined;
  const salary = details.salaryMin != null || details.salaryMax != null
    ? `${details.salaryMin?.toLocaleString("fr-FR") ?? "…"} – ${details.salaryMax?.toLocaleString("fr-FR") ?? "…"} ${details.currency ?? "TND"}`
    : null;
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3">
      <div className="flex flex-wrap gap-1.5">
        {[details.profession, details.family, contract, level, mode, [details.city, details.governorate].filter(Boolean).join(", ") || details.location, salary].filter(Boolean).map((item) => (
          <span key={item} className="rounded-full border border-[var(--sa-border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--sa-text-secondary)]">{item}</span>
        ))}
      </div>
      {details.skills?.length ? (
        <p className="text-xs text-[var(--sa-text-secondary)]"><strong className="font-semibold text-[var(--sa-text)]">Compétences :</strong> {details.skills.join(" · ")}</p>
      ) : null}
      {details.requiredSkills?.length ? <p className="text-xs text-[var(--sa-text-secondary)]"><strong className="font-semibold text-[var(--sa-text)]">Indispensables :</strong> {details.requiredSkills.join(" · ")}</p> : null}
      {details.preferredSkills?.length ? <p className="text-xs text-[var(--sa-text-secondary)]"><strong className="font-semibold text-[var(--sa-text)]">Souhaitées :</strong> {details.preferredSkills.join(" · ")}</p> : null}
      {details.responsibilities?.length ? <div className="text-xs text-[var(--sa-text-secondary)]"><strong className="font-semibold text-[var(--sa-text)]">Missions :</strong><ul className="mt-1 list-disc space-y-0.5 pl-5">{details.responsibilities.map((task, index) => <li key={`${index}-${task}`}>{task}</li>)}</ul></div> : null}
      {details.education ? <p className="text-xs text-[var(--sa-text-secondary)]"><strong className="font-semibold text-[var(--sa-text)]">Formation :</strong> {details.education}</p> : null}
      {details.deadline ? <p className="text-xs text-[var(--sa-text-secondary)]">Candidatures jusqu’au {new Date(details.deadline).toLocaleDateString("fr-FR")}</p> : null}
      {details.applicationUrl ? <a href={details.applicationUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-[var(--sa-action)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Postuler</a> : null}
    </div>
  );
}

export function PostBody({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);
  const text = plainText(post.content);
  const firstLine = text.split(" ").slice(0, 12).join(" ");
  const showTitle = post.title.trim() !== firstLine && !text.startsWith(post.title.trim());
  const long = text.length > 220;
  return (
    <div>
      {post.celebration ? (
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
          <PartyPopper className="size-3.5" />
          {celebrationLabel(post)}
        </p>
      ) : null}
      {showTitle ? (
        <h2 className="sa-display text-[17px] font-bold leading-6 tracking-tight text-[var(--sa-text)]">
          {post.title}
        </h2>
      ) : null}
      <p
        className={cn(
          "whitespace-pre-wrap text-[15px] leading-[1.55] text-[var(--sa-text)]",
          showTitle && "mt-1.5",
          !expanded && long && "line-clamp-3",
        )}
      >
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-0.5 text-[14px] font-semibold text-[var(--sa-text-secondary)] hover:text-[var(--sa-action)] hover:underline"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
        >
          {expanded ? "voir moins" : "...voir plus"}
        </button>
      ) : null}
    </div>
  );
}

export function PostContent({ content }: { content: string }) {
  const safe = sanitizePostContent(content);
  if (safe.includes("<")) {
    return (
      <div
        className="space-y-3 text-[15px] leading-7 [&_a]:text-primary [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }
  return (
    <div className="space-y-4 text-[15px] leading-7">
      {content.split("\n\n").map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function PostExtras({ post }: { post: Post }) {
  const [results, setResults] = useState<PollResults | null>(post.pollResults ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const poll = post.poll;
  useEffect(() => {
    const update = () => setNow(new Date().getTime());
    const startTimer = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(timer);
    };
  }, [post.id]);
  const closed = poll ? now > 0 && new Date(poll.closesAt).getTime() < now : false;
  const counts = results?.counts ?? poll?.options.map(() => 0) ?? [];
  const total = results?.total ?? 0;

  async function vote(index: number) {
    if (closed || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await votePollAction(post.id, index);
      setResults(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote impossible.");
    } finally {
      setBusy(false);
    }
  }

  const media =
    (post.media ?? []).length > 0
      ? (post.media ?? [])
      : post.coverImageUrl
        ? [{ type: "image" as const, url: post.coverImageUrl, name: "cover" }]
        : [];

  return (
    <div className="mt-3 space-y-3">
      {media.length > 0 ? (
        <div className={cn("grid gap-2", media.length > 1 && "grid-cols-2")}>
          {media.map((item) =>
            item.type === "image" ? (
              <Image
                key={item.url}
                src={item.url}
                alt={item.name || "Photo de la publication"}
                width={1280}
                height={720}
                unoptimized
                className="max-h-80 w-full rounded-[8px] object-cover"
              />
            ) : item.type === "video" ? (
              <video
                key={item.url}
                src={item.url}
                controls
                playsInline
                preload="metadata"
                poster={media.find((m) => m.type === "image")?.url}
                className={cn(
                  "max-h-80 w-full rounded-[8px] bg-black",
                  media.length > 1 && "col-span-2",
                )}
              >
                <source src={item.url} type="video/mp4" />
              </video>
            ) : (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-[8px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3 hover:bg-[var(--sa-hover)]"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[4px] bg-[#B24020] text-[11px] font-bold text-white">
                  PDF
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--sa-text)]">
                    {item.name || "Document"}
                  </span>
                  <span className="block text-[12px] text-[var(--sa-text-secondary)]">
                    Document · Télécharger
                  </span>
                </span>
                <span className="sa-btn-secondary shrink-0 px-3 py-1 text-[12px]">
                  Télécharger
                </span>
              </a>
            ),
          )}
        </div>
      ) : null}

      {post.event ? (
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="inline-flex items-center gap-2 font-medium">
            <CalendarDays className="size-4 text-blue-700" />
            {new Date(post.event.startsAt).toLocaleString("fr-FR", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
          {post.event.location ? (
            <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" />
              {post.event.location}
            </p>
          ) : null}
          {post.event.link ? (
            <a href={post.event.link} target="_blank" rel="noreferrer" className="mt-2 block text-blue-700 hover:underline">
              Lien de l’événement
            </a>
          ) : null}
        </div>
      ) : null}

      {poll ? (
        <div className="mt-1 space-y-2 rounded-[14px] border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3.5">
          {poll.options.map((option, index) => {
            const count = counts[index] ?? 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            const selected = results?.myOption === index;
            return (
              <button
                key={option}
                type="button"
                disabled={closed || busy}
                onClick={() => void vote(index)}
                className={cn(
                  "relative w-full overflow-hidden rounded-[12px] border px-3.5 py-3 text-left text-sm transition-colors",
                  selected
                    ? "border-[var(--sa-action)] bg-white"
                    : "border-transparent bg-white/80 hover:border-[var(--sa-action)]/40",
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-[var(--sa-action)]/12"
                  style={{ width: `${percent}%` }}
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="font-semibold text-[var(--sa-text)]">{option}</span>
                  <span className="text-[12px] font-bold tabular-nums text-[var(--sa-action)]">
                    {percent}%
                  </span>
                </span>
              </button>
            );
          })}
          <p className="px-1 text-[12px] text-[var(--sa-text-muted)]">
            {total} vote{total > 1 ? "s" : ""}
            {closed
              ? " · sondage terminé"
              : poll.closesAt
                ? ` · Il reste ${Math.max(0, Math.ceil((new Date(poll.closesAt).getTime() - now) / 86400000))} jours`
                : ""}
          </p>
          {error ? <p className="text-xs text-[var(--sa-danger)]">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
