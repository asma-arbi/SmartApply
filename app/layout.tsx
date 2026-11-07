import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppMain } from "@/components/layout/app-main";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SpaceShell } from "@/components/layout/space-shell";
import { Providers } from "@/components/providers";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { PurgeStaleTheme } from "@/components/pwa/purge-stale-theme";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} — Annonces carrière`,
  description:
    "Conseils carrière, actus recrutement, stages et annonces d'entreprise",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className="h-full"
    >
      <body className="flex min-h-full flex-col bg-background text-foreground antialiased">
        <Providers>
          <PurgeStaleTheme />
          <OfflineBanner />
          <SpaceShell>
            <Suspense fallback={<div className="h-[65px]" aria-hidden="true" />}>
              <Header />
            </Suspense>
            <AppMain>{children}</AppMain>
          </SpaceShell>
          <Suspense fallback={null}>
            <MobileBottomNav />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
