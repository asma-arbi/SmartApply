"use client";

import { useState, useEffect } from "react";
import { useOffline } from "next/offline";
import {
  Smartphone,
  Globe,
  Layers,
  Wifi,
  WifiOff,
  Download,
  Shield,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HardDrive,
} from "lucide-react";

/* ================================================================== */
/*  Données de comparaison                                            */
/* ================================================================== */

type FeatureRow = {
  feature: string;
  native: "yes" | "partial" | "no";
  hybrid: "yes" | "partial" | "no";
  pwa: "yes" | "partial" | "no";
  note?: string;
};

const COMPARISON_DATA: FeatureRow[] = [
  {
    feature: "Installation depuis un store",
    native: "yes",
    hybrid: "yes",
    pwa: "no",
    note: "PWA : installée depuis le navigateur",
  },
  {
    feature: "Fonctionne hors ligne",
    native: "yes",
    hybrid: "partial",
    pwa: "yes",
    note: "PWA : via Service Worker + cache",
  },
  {
    feature: "Accès aux APIs natives (caméra, GPS…)",
    native: "yes",
    hybrid: "yes",
    pwa: "partial",
    note: "PWA : accès limité via Web APIs",
  },
  {
    feature: "Notifications push",
    native: "yes",
    hybrid: "yes",
    pwa: "yes",
    note: "PWA : supporté iOS 16.4+, Android, Desktop",
  },
  {
    feature: "Mise à jour instantanée",
    native: "no",
    hybrid: "no",
    pwa: "yes",
    note: "PWA : pas besoin de passer par le store",
  },
  {
    feature: "Code unique multi-plateforme",
    native: "no",
    hybrid: "yes",
    pwa: "yes",
    note: "Native : code séparé iOS / Android",
  },
  {
    feature: "Performance native",
    native: "yes",
    hybrid: "partial",
    pwa: "partial",
    note: "PWA : proche du natif avec optimisations",
  },
  {
    feature: "Coût de développement",
    native: "no",
    hybrid: "partial",
    pwa: "yes",
    note: "PWA : une seule base de code web",
  },
  {
    feature: "SEO & indexation",
    native: "no",
    hybrid: "no",
    pwa: "yes",
    note: "PWA : indexable par les moteurs de recherche",
  },
  {
    feature: "Ajout écran d'accueil",
    native: "yes",
    hybrid: "yes",
    pwa: "yes",
    note: "PWA : via manifest + prompt d'installation",
  },
];

/* ================================================================== */
/*  Composants de la page                                             */
/* ================================================================== */

function StatusIcon({ status }: { status: "yes" | "partial" | "no" }) {
  switch (status) {
    case "yes":
      return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
    case "partial":
      return <MinusCircle className="h-5 w-5 text-amber-500" />;
    case "no":
      return <XCircle className="h-5 w-5 text-red-400" />;
  }
}

function ConnectivityStatus() {
  const isOffline = useOffline();

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
        isOffline
          ? "bg-amber-100 text-amber-700"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          Hors ligne
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          En ligne
        </>
      )}
    </div>
  );
}

function PWAStatusCard() {
  const [swStatus, setSwStatus] = useState<string>("Vérification…");
  const [isInstalled, setIsInstalled] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>("—");

  useEffect(() => {
    // Service Worker status
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwStatus(reg ? "✅ Actif" : "❌ Non enregistré");
      });
    } else {
      setSwStatus("❌ Non supporté");
    }

    // Installed?
    setIsInstalled(
      window.matchMedia("(display-mode: standalone)").matches
    );

    // Cache size estimate
    if ("storage" in navigator && "estimate" in navigator.storage) {
      navigator.storage.estimate().then((est) => {
        const usage = est.usage || 0;
        setCacheSize(
          usage < 1024
            ? `${usage} octets`
            : usage < 1024 * 1024
              ? `${(usage / 1024).toFixed(1)} Ko`
              : `${(usage / (1024 * 1024)).toFixed(1)} Mo`
        );
      });
    }
  }, []);

  const items = [
    {
      icon: <Shield className="h-5 w-5" />,
      label: "Service Worker",
      value: swStatus,
    },
    {
      icon: <Download className="h-5 w-5" />,
      label: "Installée",
      value: isInstalled ? "✅ Oui" : "Non (navigateur)",
    },
    {
      icon: <HardDrive className="h-5 w-5" />,
      label: "Cache utilisé",
      value: cacheSize,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="text-primary">{item.icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-sm font-semibold">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Page principale                                                    */
/* ================================================================== */

export default function PWAPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          🚀 SmartApply PWA
        </h1>
        <p className="mt-2 text-muted-foreground">
          Application Web Progressive — installable, hors ligne, performante
        </p>
        <div className="mt-4">
          <ConnectivityStatus />
        </div>
      </div>

      {/* Statut PWA */}
      <section>
        <h2 className="mb-4 text-xl font-bold">📊 Statut de la PWA</h2>
        <PWAStatusCard />
      </section>

      {/* Comparaison */}
      <section>
        <h2 className="mb-4 text-xl font-bold">
          ⚖️ Native vs Hybride vs PWA
        </h2>

        {/* Légende des colonnes */}
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Native</span>
            <span className="text-muted-foreground">
              (Swift, Kotlin)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-500" />
            <span className="font-medium">Hybride</span>
            <span className="text-muted-foreground">
              (React Native, Flutter)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="font-medium">PWA</span>
            <span className="text-muted-foreground">
              (Next.js + Service Worker)
            </span>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold">
                  Fonctionnalité
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <Smartphone className="mx-auto h-4 w-4 text-blue-500" />
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <Layers className="mx-auto h-4 w-4 text-purple-500" />
                </th>
                <th className="px-4 py-3 text-center font-semibold">
                  <Globe className="mx-auto h-4 w-4 text-blue-500" />
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-border last:border-0 ${
                    i % 2 === 0 ? "bg-card" : "bg-muted/20"
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.feature}</p>
                    {row.note && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.note}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon status={row.native} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon status={row.hybrid} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon status={row.pwa} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
            Supporté
          </span>
          <span className="flex items-center gap-1">
            <MinusCircle className="h-3.5 w-3.5 text-amber-500" />
            Partiel
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            Non supporté
          </span>
        </div>
      </section>

      {/* Architecture PWA */}
      <section>
        <h2 className="mb-4 text-xl font-bold">
          🏗️ Architecture de cette PWA
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <ArchCard
            icon={<Globe className="h-6 w-6" />}
            title="Web App Manifest"
            desc="Fichier manifest.ts déclarant le nom, les icônes, la couleur du thème et le mode d'affichage standalone pour l'installation sur l'écran d'accueil."
          />
          <ArchCard
            icon={<Shield className="h-6 w-6" />}
            title="Service Worker"
            desc="Intercepte les requêtes réseau avec stratégie Cache-first (assets) et Network-first (pages), pré-cache les ressources essentielles au premier chargement."
          />
          <ArchCard
            icon={<Zap className="h-6 w-6" />}
            title="Offline Detection"
            desc="Le hook useOffline (Next.js 16) détecte la connectivité et relance automatiquement les navigations et Server Actions en attente."
          />
          <ArchCard
            icon={<RefreshCw className="h-6 w-6" />}
            title="Cache Strategies"
            desc="Cache-first pour les fichiers statiques (_next/static, images, fonts), Network-first pour le HTML et les API avec fallback sur le cache."
          />
        </div>
      </section>

      {/* Technologies */}
      <section>
        <h2 className="mb-4 text-xl font-bold">🛠️ Stack technique</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Next.js 16",
            "React 19",
            "TypeScript",
            "Tailwind CSS 4",
            "Service Worker",
            "Web App Manifest",
            "useOffline Hook",
            "Cache API",
            "Mongoose",
            "MongoDB",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function ArchCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 text-primary">{icon}</div>
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </div>
  );
}
