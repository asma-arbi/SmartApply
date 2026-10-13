import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export const metadata = { title: "JobBoard", description: "Publiez vos offres d'emploi" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await createClient().auth.getUser();
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900">
        <nav className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-blue-700">JobBoard</Link>
            <div className="flex items-center gap-4 text-sm">
              {user ? (
                <>
                  <Link href="/dashboard">Mon espace</Link>
                  <Link href="/dashboard/jobs/new" className="bg-blue-600 text-white px-3 py-1.5 rounded">Publier une offre</Link>
                  <form action={logout}><button className="text-gray-500">Déconnexion</button></form>
                </>
              ) : (
                <>
                  <Link href="/login">Connexion</Link>
                  <Link href="/register" className="bg-blue-600 text-white px-3 py-1.5 rounded">Espace entreprise</Link>
                </>
              )}
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
