"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  Bookmark,
  Briefcase,
  Home,
  MessageCircle,
  PlusCircle,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { homeForRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { useNotificationCounts } from "@/hooks/use-notification-counts";

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, ready } = useAuth();
  const notificationCounts = useNotificationCounts();

  if (!ready || !user || pathname.startsWith("/login") || pathname.startsWith("/apply")) {
    return null;
  }

  const home = homeForRole(user.role);
  const items =
    user.role === "ADMIN"
      ? [
          { href: "/admin/reports", label: "Modération", icon: ShieldAlert },
          { href: "/admin/posts", label: "Posts", icon: Home },
          { href: "/login", label: "Compte", icon: UserRound },
        ]
      : user.role === "COMPANY"
        ? [
            { href: "/company", label: "Accueil", icon: Home },
            { href: "/company?compose=1", label: "Publier", icon: PlusCircle },
            { href: "/company?box=drafts", label: "Brouillons", icon: Bell },
            { href: "/reseau", label: "Réseau", icon: Users },
            { href: "/messages", label: "Messages", icon: MessageCircle },
            { href: "/reseau?view=notifications#notifications", label: "Notifs", icon: Bell },
            { href: "/saved", label: "Enregistrés", icon: Bookmark },
          ]
        : [
            { href: "/", label: "Accueil", icon: Home },
            { href: "/?category=JOB_OPENING", label: "Offres", icon: Briefcase },
            { href: "/?compose=1", label: "Publier", icon: PlusCircle },
            { href: "/reseau", label: "Réseau", icon: Users },
            { href: "/messages", label: "Messages", icon: MessageCircle },
            { href: "/reseau?view=notifications#notifications", label: "Notifs", icon: Bell },
            { href: "/saved", label: "Enregistrés", icon: Bookmark },
          ];

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--sa-border)] bg-[var(--sa-card)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul
        className="mx-auto grid h-[var(--sa-mobile-nav-h)] w-full max-w-lg"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const base = item.href.split("?")[0];
          const active =
            item.href === home || item.label === "Accueil"
              ? pathname === home && !(user.role === "COMPANY" && (searchParams.has("box") || searchParams.has("compose")))
              : item.label === "Enregistrés"
                ? pathname.startsWith("/saved")
                : item.label === "Publier"
                  ? pathname.includes("/new") || pathname.includes("compose")
                  : item.label === "Offres"
                    ? pathname === "/" && searchParams.get("category") === "JOB_OPENING"
                    : item.label === "Brouillons"
                      ? pathname === "/company" && searchParams.get("box") === "drafts"
                      : item.label === "Mes posts"
                        ? pathname === "/" && searchParams.get("box") === "mine"
                        : item.label === "Réseau"
                          ? pathname.startsWith("/reseau") || pathname.startsWith("/groupes")
                          : item.label === "Messages"
                            ? pathname.startsWith("/messages")
                            : item.label === "Notifs"
                              ? pathname.startsWith("/reseau") && searchParams.get("view") === "notifications"
                        : pathname.startsWith(base) && item.href !== "/login";
          const Icon = item.icon;
          return (
            <li key={item.href + item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                  active ? "text-[var(--sa-text)]" : "text-[var(--sa-text-secondary)]",
                )}
              >
                <span className="relative">
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.2 : 1.8}
                    fill={active && item.label === "Accueil" ? "currentColor" : "none"}
                  />
                  {item.label === "Messages" && notificationCounts.messages > 0 ? <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] leading-4 text-white">{notificationCounts.messages > 9 ? "9+" : notificationCounts.messages}</span> : null}
                  {item.label === "Réseau" && notificationCounts.network > 0 ? <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] leading-4 text-white">{notificationCounts.network > 9 ? "9+" : notificationCounts.network}</span> : null}
                  {item.label === "Notifs" && notificationCounts.notifications > 0 ? <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] leading-4 text-white">{notificationCounts.notifications > 9 ? "9+" : notificationCounts.notifications}</span> : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
