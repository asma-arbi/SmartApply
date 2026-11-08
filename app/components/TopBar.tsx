"use client";

import { usePathname } from "next/navigation";

interface TopBarProps {
  userName?: string;
  userEmail?: string;
  role?: string;
}

const ROUTE_TITLES: Record<string, { section: string; title: string }> = {
  "/dashboard/candidate": { section: "Candidat", title: "Accueil" },
  "/dashboard/candidate/companies": { section: "Candidat", title: "Entreprises" },
  "/dashboard/candidate/applications": { section: "Candidat", title: "Mes candidatures" },
  "/dashboard/candidate/saved": { section: "Candidat", title: "Offres sauvegardées" },
  "/dashboard/candidate/settings": { section: "Candidat", title: "Paramètres" },
  "/dashboard/company": { section: "Entreprise", title: "Mon espace" },
  "/dashboard/company/jobs": { section: "Entreprise", title: "Mes offres d'emploi" },
  "/dashboard/jobs/new": { section: "Entreprise", title: "Publier une offre" },
  "/dashboard/company/settings": { section: "Entreprise", title: "Paramètres" },
  "/dashboard/admin": { section: "Administration", title: "Tableau de bord" },
  "/dashboard/admin/users": { section: "Administration", title: "Utilisateurs" },
  "/dashboard/admin/companies": { section: "Administration", title: "Entreprises" },
  "/dashboard/admin/jobs": { section: "Administration", title: "Offres d'emploi" },
  "/dashboard/admin/reports": { section: "Administration", title: "Rapports & Audit" },
};

export default function TopBar({ userName, userEmail, role }: TopBarProps) {
  const pathname = usePathname();

  // Find matching route or fallback dynamically
  const routeInfo = ROUTE_TITLES[pathname] ?? {
    section: role === "entreprise" ? "Entreprise" : role === "admin" ? "Administration" : "Candidat",
    title: pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, " ")
      ?.replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Tableau de bord",
  };

  const initial = (userName?.charAt(0) || userEmail?.charAt(0) || "U").toUpperCase();

  return (
    <header className="h-14 border-b border-slate-100 bg-white flex items-center justify-between px-6 flex-shrink-0 z-10">
      {/* Breadcrumb / Page Title */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs">
        <span className="font-medium text-slate-400">{routeInfo.section}</span>
        <ChevronRightIcon className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-slate-800">{routeInfo.title}</span>
      </nav>

      {/* Right controls: Notifications & User profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <BellIcon className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-4 w-px bg-slate-100" />

        {/* User Avatar + Name */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
            {initial}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              {userName || "Utilisateur"}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {userEmail || ""}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
