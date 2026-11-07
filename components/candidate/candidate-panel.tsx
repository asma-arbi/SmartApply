"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePosts } from "@/hooks/use-posts";
import {
  type CandidateProfile,
  type LetterApplication,
} from "@/lib/letters-api";
import { listLetterApplicationsAction } from "@/server/actions/letters.actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { candidateDisplayName } from "@/lib/candidate-name";

export function CandidatePanel() {
  const { user } = useAuth();
  const { posts: saved } = usePosts("bookmarks");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<LetterApplication[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await listLetterApplicationsAction();
        if (cancelled) return;
        setProfile(data.profile as unknown as CandidateProfile);
        setApplications(data.items as unknown as LetterApplication[]);
      } catch {
        /* keep the last snapshot */
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user]);

  if (!user) {
    return (
      <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold">Votre espace</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Connectez-vous pour retrouver vos candidatures, votre profil et vos favoris.
        </p>
        <Link href="/login" className={buttonVariants({ size: "sm", className: "mt-4 w-full" })}>
          Se connecter
        </Link>
      </section>
    );
  }

  const name = candidateDisplayName(profile?.fullName, user.name);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="bg-gradient-to-r from-blue-700 to-sky-500 px-4 py-4 text-white">
          <div className="flex items-center gap-3">
            <Avatar
              name={name}
              initials={initials || "C"}
              className="size-11 bg-white/20 text-white ring-white/30"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              {(profile?.headline || profile?.city) ? (
                <p className="truncate text-xs text-white/80">
                  {[profile?.headline, profile?.city].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {profile && profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Stat value={applications.length} label="Candidatures" />
            <Stat value={saved.length} label="Favoris" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Candidatures</p>
        </div>
        {applications.length === 0 ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Aucune candidature pour le moment.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {applications.map((item) => (
              <li key={item.id} className="rounded-2xl bg-muted/50 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-5">{item.job?.title ?? "Offre"}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      item.status === "ACCEPTED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {item.status === "PENDING" ? "En attente" : item.status === "ACCEPTED" ? "Acceptée" : item.status === "REJECTED" ? "Refusée" : "Retirée"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.company?.name ?? "Entreprise"}
                  {item.job?.city ? ` · ${item.job.city}` : ""}
                  {item.job?.type ? ` · ${item.job.type}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/saved"
        className="flex items-center justify-between rounded-3xl border border-border bg-card px-4 py-3.5 text-sm font-medium shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:border-primary/30"
      >
        <span className="inline-flex items-center gap-2">
          <Bookmark className="size-4 text-primary" />
          Favoris
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {saved.length}
        </span>
      </Link>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-muted/70 px-2 py-2.5 text-center">
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
