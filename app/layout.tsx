import type { Metadata, Viewport } from "next";
import "./globals.css";

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
import ReCaptchaScript from "@/app/components/ReCaptchaScript";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full font-sans">
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
        <ReCaptchaScript />
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}
