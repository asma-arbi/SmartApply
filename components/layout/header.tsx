"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Briefcase,
  Home,
  Search,
  ChevronDown,
  Bookmark,
  Users,
  PenLine,
  FileText,
  MessageCircle,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { homeForRole } from "@/lib/roles";
import { candidateDisplayName } from "@/lib/candidate-name";
import { getMyProfileVisualsAction } from "@/server/actions/profile.actions";
import { useAuth } from "@/hooks/use-auth";
import { useMyCompany } from "@/hooks/use-catalog";
import { useNotificationCounts } from "@/hooks/use-notification-counts";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout, ready } = useAuth();
  const { company } = useMyCompany();
  const isLogin = pathname.startsWith("/login");
  const role = ready ? user?.role : undefined;
  const home = ready ? homeForRole(role) : "/";
  const [q, setQ] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const notificationCounts = useNotificationCounts();

  useEffect(() => {
    if (!ready || !user) {
      const resetTimer = window.setTimeout(() => {
        setProfileName(null);
        setProfileAvatar(null);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    let cancelled = false;
    const loadProfile = () => {
      void getMyProfileVisualsAction().then((profile) => {
        if (!cancelled) {
          setProfileName(profile.name?.trim() || null);
          setProfileAvatar(profile.url || null);
        }
      }).catch(() => {
        if (!cancelled) {
          setProfileName(null);
          setProfileAvatar(null);
        }
      });
    };
    loadProfile();
    const interval = window.setInterval(loadProfile, 30_000);
    window.addEventListener("smartapply:profile-updated", loadProfile);
    window.addEventListener("smartapply:avatar-updated", loadProfile);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("smartapply:profile-updated", loadProfile);
      window.removeEventListener("smartapply:avatar-updated", loadProfile);
    };
  }, [ready, user]);

  const accountName = (user?.role === "COMPANY"
    ? profileName || company?.name || user.name
    : user?.role === "CANDIDATE"
      ? candidateDisplayName(profileName, user.name) || user.name || "Candidat"
      : user?.name || "Compte") || "Compte";
  const accountInitials = accountName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const nav = isLogin
    ? []
    : role === "ADMIN"
      ? [
          { href: "/admin", label: "Accueil", icon: Home },
          { href: "/admin/posts", label: "Posts", icon: Briefcase },
          { href: "/admin/reports", label: "Signalements", icon: Bell },
        ]
      : role === "COMPANY"
        ? [
            { href: "/company", label: "Accueil", icon: Home },
            { href: "/company?compose=1", label: "Publier", icon: PenLine },
            { href: "/company?box=drafts", label: "Brouillons", icon: FileText },
            { href: "/reseau", label: "Réseau", icon: Users },
            { href: "/messages", label: "Messages", icon: MessageCircle },
            { href: "/reseau?view=notifications#notifications", label: "Notifications", icon: Bell },
            { href: "/saved", label: "Enregistrés", icon: Bookmark },
          ]
        : [
            { href: "/", label: "Accueil", icon: Home },
            { href: "/?category=JOB_OPENING", label: "Offres", icon: Briefcase },
            { href: "/reseau", label: "Réseau", icon: Users },
            { href: "/messages", label: "Messages", icon: MessageCircle },
            { href: "/reseau?view=notifications#notifications", label: "Notifications", icon: Bell },
            { href: "/saved", label: "Enregistrés", icon: Bookmark },
          ];

  function isActive(href: string, label: string) {
    if (label === "Accueil") {
      if (role === "COMPANY") {
        return pathname === home && !searchParams.has("box") && !searchParams.has("compose");
      }
      return pathname === home;
    }
    if (label === "Offres") return searchParams.get("category") === "JOB_OPENING";
    if (label === "Réseau") return (pathname.startsWith("/reseau") && searchParams.get("view") !== "notifications") || pathname.startsWith("/groupes");
    if (label === "Messages") return pathname.startsWith("/messages");
    if (label === "Notifications") return pathname.startsWith("/reseau") && searchParams.get("view") === "notifications";
    if (label === "Enregistrés") return pathname.startsWith("/saved");
    if (label === "Brouillons") return pathname === "/company" && searchParams.get("box") === "drafts";
    if (label === "Publier") return searchParams.get("compose") === "1" || pathname === "/posts/new";
    if (label === "Posts") return pathname.startsWith("/admin/posts");
    if (label === "Signalements") return pathname.startsWith("/admin/reports");
    if (href.startsWith("/company")) return pathname.startsWith("/company") && !searchParams.get("compose");
    return false;
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = q.trim();
    if (!value) return;
    const base = role === "COMPANY" ? "/company" : role === "ADMIN" ? "/admin/posts" : "/";
    router.push(`${base}?q=${encodeURIComponent(value)}`);
    setMobileSearchOpen(false);
  }

  const showAuthedChrome = ready && Boolean(user) && !isLogin;

  if (isLogin) {
    return (
      <header className="sticky top-0 z-30">
        <div className="mx-auto flex h-16 w-full max-w-[1128px] items-center px-4">
          <Logo href="/" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--sa-border)] bg-white/85 shadow-[var(--sa-shadow-header)] backdrop-blur-xl">
      <div className="mx-auto flex h-[var(--sa-header-h)] w-full max-w-[var(--sa-feed-max)] items-center gap-2.5 px-3 sm:px-4">
        <Logo href={home} className="shrink-0" />

        <button
          type="button"
          aria-label={mobileSearchOpen ? "Fermer la recherche" : "Ouvrir la recherche"}
          aria-expanded={mobileSearchOpen}
          onClick={() => setMobileSearchOpen((open) => !open)}
          className="ml-auto inline-flex size-9 items-center justify-center rounded-full text-[var(--sa-text-secondary)] hover:bg-[var(--sa-hover)] md:hidden"
        >
          <Search className="size-5" />
        </button>

        <form onSubmit={submitSearch} className="relative ml-2 hidden min-w-0 max-w-[280px] flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--sa-text-muted)]" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Recherche"
            className="h-9 w-full rounded-full border border-transparent bg-[var(--sa-surface-soft)] pl-9 pr-3 text-[13px] text-[var(--sa-text)] outline-none transition-[background,box-shadow,border-color] placeholder:text-[var(--sa-text-muted)] focus:border-[#2563eb]/40 focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.14)]"
            aria-label="Rechercher"
          />
        </form>

        <nav className="ml-auto flex h-full items-stretch gap-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.label);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative hidden min-w-[68px] flex-col items-center justify-center gap-0.5 px-2.5 text-[11px] font-medium tracking-tight transition-colors md:inline-flex",
                  active
                    ? "text-[#2563eb]"
                    : "text-[var(--sa-text-secondary)] hover:text-[var(--sa-text)]",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 1.85 : 1.5} />
                <span className="relative flex items-center gap-1">{item.label}{item.label === "Messages" && notificationCounts.messages > 0 ? <span className="min-w-4 rounded-full bg-red-500 px-1 text-[9px] leading-4 text-white">{notificationCounts.messages > 9 ? "9+" : notificationCounts.messages}</span> : null}{item.label === "Réseau" && notificationCounts.network > 0 ? <span className="min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] leading-4 text-white">{notificationCounts.network > 9 ? "9+" : notificationCounts.network}</span> : null}{item.label === "Notifications" && notificationCounts.notifications > 0 ? <span className="min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] leading-4 text-white">{notificationCounts.notifications > 9 ? "9+" : notificationCounts.notifications}</span> : null}</span>
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#2563eb]" />
                ) : null}
              </Link>
            );
          })}

          {showAuthedChrome ? (
            <DropdownMenu
              align="end"
              trigger={
                <button
                  type="button"
                  className="relative ml-1 inline-flex items-center gap-2 rounded-full px-1.5 py-1 text-[13px] font-semibold text-[var(--sa-text)] transition-colors hover:bg-[var(--sa-hover)]"
                >
                  <Avatar
                    name={accountName}
                    initials={accountInitials || "SA"}
                    src={profileAvatar}
                    className="size-8 bg-[var(--sa-action)] text-[11px] text-white ring-2 ring-[#eff5ff]"
                  />
                {notificationCounts.network + notificationCounts.notifications + notificationCounts.messages > 0 ? <span className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-white bg-red-500" aria-label="Notifications non lues" /> : null}
                  <span className="hidden items-center gap-0.5 sm:inline-flex">
                    <span className="max-w-36 truncate">{accountName}</span> <ChevronDown className="size-3.5 shrink-0 opacity-50" />
                  </span>
                </button>
              }
            >
              <div className="px-3 py-2">
                <p className="max-w-48 truncate text-sm font-semibold">{accountName}</p>
                <p className="max-w-48 truncate text-[12px] text-[var(--sa-text-secondary)]">{ROLE_LABELS[user!.role]} · {user!.email}</p>
              </div>
              <DropdownMenuItem onClick={() => router.push(home)}>Accueil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/reseau")}>Réseau{notificationCounts.network ? ` · ${notificationCounts.network} notification${notificationCounts.network > 1 ? "s" : ""}` : ""}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/messages")}>Messagerie{notificationCounts.messages ? ` · ${notificationCounts.messages} non lu${notificationCounts.messages > 1 ? "s" : ""}` : ""}</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    role === "CANDIDATE" ? "/?compose=1" : "/company?compose=1",
                  )
                }
              >
                Créer un post
              </DropdownMenuItem>
              {role === "CANDIDATE" ? (
                <>
                  <DropdownMenuItem onClick={() => router.push("/saved")}>
                    Posts enregistrés
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/matches")}>
                    Offres recommandées
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenu>
          ) : (
            <div className="ml-1 flex items-center gap-2">
              <Link
                href="/register"
                className="hidden h-9 items-center rounded-full px-3 text-[13px] font-semibold text-[var(--sa-text-secondary)] transition-colors hover:bg-[var(--sa-hover)] hover:text-[var(--sa-text)] sm:inline-flex"
              >
                S’inscrire
              </Link>
              <Link
                href="/login"
                className="sa-btn-primary inline-flex h-9 items-center px-4 text-[13px]"
              >
                Connexion
              </Link>
            </div>
          )}
        </nav>
      </div>
      {mobileSearchOpen ? (
        <form onSubmit={submitSearch} className="border-t border-[var(--sa-border)] bg-white px-3 py-2 shadow-sm md:hidden">
          <div className="relative mx-auto max-w-[var(--sa-feed-max)]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sa-text-muted)]" />
            <input
              autoFocus
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Rechercher des offres, entreprises…"
              className="h-10 w-full rounded-full border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] pl-10 pr-4 text-sm outline-none focus:border-[#2563eb]/50 focus:bg-white"
              aria-label="Rechercher"
            />
          </div>
        </form>
      ) : null}
    </header>
  );
}
