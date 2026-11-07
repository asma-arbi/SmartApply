"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORIES, LANGUAGE_FILTERS, SOURCE_FILTERS } from "@/lib/constants";
import { isUuid } from "@/lib/mappers";
import type { PostCategory, PostLanguage, PostOrigin } from "@/types/post";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

export function PostFilters({
  query,
  onQuery,
  companyId,
  onCompanyId,
  jobId,
  onJobId,
  tag,
  onTag,
  category,
  onCategory,
  language,
  onLanguage,
  origin,
  onOrigin,
  searchPlaceholder = "Titre, entreprise, offre ou tag…",
}: {
  query: string;
  onQuery: (value: string) => void;
  companyId: string;
  onCompanyId: (value: string) => void;
  jobId?: string;
  onJobId?: (value: string) => void;
  tag: string;
  onTag: (value: string) => void;
  category: PostCategory | "tous";
  onCategory: (value: PostCategory | "tous") => void;
  language?: PostLanguage | "tous";
  onLanguage?: (value: PostLanguage | "tous") => void;
  origin?: PostOrigin | "tous";
  onOrigin?: (value: PostOrigin | "tous") => void;
  searchPlaceholder?: string;
}) {
  const [tagDraft, setTagDraft] = useState(tag);
  const [companyDraft, setCompanyDraft] = useState(isUuid(companyId) ? "" : companyId);
  const [jobDraft, setJobDraft] = useState(isUuid(jobId ?? "") ? "" : (jobId ?? ""));

  useEffect(() => {
    setTagDraft(tag);
  }, [tag]);

  useEffect(() => {
    setCompanyDraft(isUuid(companyId) ? "" : companyId);
  }, [companyId]);

  useEffect(() => {
    setJobDraft(isUuid(jobId ?? "") ? "" : (jobId ?? ""));
  }, [jobId]);

  useEffect(() => {
    if (isUuid(companyId) && companyDraft === "") return;
    const timer = window.setTimeout(() => {
      const next = companyDraft.trim();
      if (next !== (isUuid(companyId) ? "" : companyId)) onCompanyId(next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [companyDraft, companyId, onCompanyId]);

  useEffect(() => {
    if (!onJobId) return;
    if (isUuid(jobId ?? "") && jobDraft === "") return;
    const timer = window.setTimeout(() => {
      const next = jobDraft.trim();
      if (next !== (isUuid(jobId ?? "") ? "" : (jobId ?? ""))) onJobId(next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [jobDraft, jobId, onJobId]);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 bg-background pl-10"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Entreprise
          </span>
          <Input
            value={companyDraft}
            onChange={(event) => setCompanyDraft(event.target.value)}
            placeholder="Nom de l’entreprise"
            aria-label="Filtrer par entreprise"
            className="h-10 bg-background"
          />
        </label>
        {onJobId ? (
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Offre
            </span>
            <Input
              value={jobDraft}
              onChange={(event) => setJobDraft(event.target.value)}
              placeholder="Titre de l’offre"
              aria-label="Filtrer par offre"
              className="h-10 bg-background"
            />
          </label>
        ) : (
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tag
            </span>
            <Input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onBlur={() => onTag(tagDraft.trim())}
              onKeyDown={(event) => {
                if (event.key === "Enter") onTag(tagDraft.trim());
              }}
              placeholder="ex. stage"
              className="h-10 bg-background"
            />
          </label>
        )}
      </div>
      {onJobId ? (
        <Input
          value={tagDraft}
          onChange={(event) => setTagDraft(event.target.value)}
          onBlur={() => onTag(tagDraft.trim())}
          onKeyDown={(event) => {
            if (event.key === "Enter") onTag(tagDraft.trim());
          }}
          placeholder="Tag (ex. stage, tunis, data)"
          className="h-10 bg-background"
        />
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Catégorie
      </p>
      <Tabs tabs={CATEGORIES} value={category} onValueChange={onCategory} />
      {onLanguage || onOrigin ? (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Langue et origine
          </p>
          {onLanguage && language ? (
            <Tabs tabs={LANGUAGE_FILTERS} value={language} onValueChange={onLanguage} />
          ) : null}
          {onOrigin && origin ? (
            <Tabs tabs={SOURCE_FILTERS} value={origin} onValueChange={onOrigin} />
          ) : null}
        </div>
      ) : null}
      {tag ? (
        <div className="flex items-center gap-2">
          <Badge variant="default">#{tag}</Badge>
          <Button size="sm" variant="ghost" onClick={() => onTag("")}>
            <X />
            Retirer
          </Button>
        </div>
      ) : null}
    </div>
  );
}
