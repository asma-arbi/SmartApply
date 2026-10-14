import { createClient } from "@/lib/supabase/server";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Briefcase } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").replace(/[,()%]/g, "");
  let query = createClient().from("jobs").select("*, companies(name)")
    .eq("status", "published").order("created_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
  const { data: jobs } = await query;

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
        
        <div className="relative text-center space-y-8 py-24 px-4">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold shadow-lg animate-pulse">
            <Briefcase className="h-4 w-4" />
            <span>Plateforme de recrutement #1 en Tunisie</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-2xl">
            Trouvez votre<br />
            <span className="bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">
              prochain emploi
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
            Découvrez les meilleures opportunités professionnelles et donnez un nouvel élan à votre carrière
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 text-white/80">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              <span className="text-sm font-medium">{jobs?.length ?? 0} offres actives</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              <span className="text-sm font-medium">Gratuit • Sans engagement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardContent className="p-8">
            <form className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Rechercher par poste, entreprise ou ville..."
                  className="pl-14 h-14 text-lg border-2 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 px-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/50 transition-all text-lg font-semibold">
                Rechercher
              </Button>
            </form>
            {q && (
              <div className="flex items-center gap-3 mt-6 p-4 bg-blue-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <p className="text-sm text-gray-700">
                  Résultats pour <span className="font-bold text-blue-600">&quot;{q}&quot;</span> • {jobs?.length ?? 0} offre{jobs && jobs.length > 1 ? "s" : ""} trouvée{jobs && jobs.length > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Listings */}
      {jobs && jobs.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {q ? "Résultats de recherche" : "Offres disponibles"}
            </h2>
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg">
              <span className="font-bold text-lg">{jobs.length}</span>
              <span className="text-sm">offre{jobs.length > 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="grid gap-5">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                href={`/jobs/${job.id}`}
                showStatus={false}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title={q ? "Aucun résultat" : "Aucune offre disponible"}
          description={
            q
              ? `Aucune offre ne correspond à votre recherche "${q}". Essayez avec d'autres mots-clés.`
              : "Aucune offre d'emploi n'est disponible pour le moment. Revenez bientôt !"
          }
        />
      )}
    </div>
  );
}
