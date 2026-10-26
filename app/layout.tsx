import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "SmartApply Tunisia",
    template: "%s | SmartApply Tunisia",
  },
  description:
    "La plateforme de l'emploi IT pour les étudiants et jeunes diplômés tunisiens.",
  keywords: ["emploi", "stage", "PFE", "IT", "Tunisie", "informatique"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SmartApply",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563EB",
};

import OfflineIndicator from "@/app/components/OfflineIndicator";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`h-full ${inter.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* PWA service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}`,
          }}
        />
      </head>
      <body className="h-full font-sans antialiased">
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}
