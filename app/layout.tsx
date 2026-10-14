import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";
import { Button } from "@/components/ui/button";
import { Briefcase, LogOut, LayoutDashboard } from "lucide-react";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "SmartApply Tunisia",
  description: "Plateforme de recrutement en Tunisie",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartApply",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SmartApply Tunisia",
    title: "SmartApply Tunisia - Plateforme de recrutement",
    description: "Trouvez votre prochain emploi ou recrutez les meilleurs talents en Tunisie",
  },
  twitter: {
    card: "summary",
    title: "SmartApply Tunisia",
    description: "Plateforme de recrutement en Tunisie",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#2563eb",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await createClient().auth.getUser();
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body>
        <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3 font-bold text-xl group">
                <div className="relative p-2.5 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                  <Briefcase className="h-6 w-6 text-white" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                </div>
                <span className="text-2xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  SmartApply
                </span>
              </Link>
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <Button variant="ghost" asChild className="hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Link href="/dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        Mon espace
                      </Link>
                    </Button>
                    <form action={logout}>
                      <Button variant="ghost" type="submit" className="hover:bg-red-50 hover:text-red-600 transition-colors">
                        <LogOut className="h-4 w-4" />
                        Déconnexion
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Link href="/login">Connexion</Link>
                    </Button>
                    <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
                      <Link href="/register">Espace entreprise</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <PWAInstallPrompt />
        <Toaster />
      </body>
    </html>
  );
}
