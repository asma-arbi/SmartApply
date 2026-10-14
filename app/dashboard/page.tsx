import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardClient } from "@/components/dashboard-client";
import { JobsListSkeleton } from "@/components/jobs-list-skeleton";
import { Briefcase, PlusCircle, Eye, FileText, XCircle, AlertCircle } from "lucide-react";

async function DashboardContent() {
  const supabase = createClient();
  
  // Get user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-destructive/10 p-6 mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Erreur d&apos;authentification</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Impossible de charger vos données. Veuillez vous reconnecter.
            </p>
            <Button asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch jobs with error handling
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", user.id)
    .order("created_at", { ascending: false });

  // Handle fetch error
  if (jobsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mes offres d&apos;emploi</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos offres d&apos;emploi et suivez leur statut
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/jobs/new">
              <PlusCircle className="h-5 w-5" />
              Nouvelle offre
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-destructive/10 p-6 mb-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Erreur de chargement</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Impossible de charger vos offres. Veuillez réessayer.
            </p>
            <Button onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const jobsList = jobs || [];
  const totalJobs = jobsList.length;
  const publishedCount = jobsList.filter((j) => j.status === "published").length;
  const draftCount = jobsList.filter((j) => j.status === "draft").length;
  const closedCount = jobsList.filter((j) => j.status === "closed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
        
        <div className="relative flex items-center justify-between">
          <div className="space-y-3">
            <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">
              Mes offres d&apos;emploi
            </h1>
            <p className="text-white/90 text-xl font-medium">
              Gérez vos offres et suivez leur performance en temps réel
            </p>
          </div>
          <Button asChild size="lg" className="h-14 px-8 bg-white text-blue-600 hover:bg-gray-50 shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all font-bold text-lg">
            <Link href="/dashboard/jobs/new">
              <PlusCircle className="h-6 w-6 mr-2" />
              Nouvelle offre
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group hover:-translate-y-1 bg-gradient-to-br from-blue-500 to-indigo-600">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/80 uppercase tracking-wider">Total</CardTitle>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-2">
            <div className="text-5xl font-black text-white">{totalJobs}</div>
            <p className="text-sm text-white/80 mt-2 font-medium">
              {totalJobs > 1 ? "offres au total" : "offre au total"}
            </p>
          </CardContent>
          <div className="h-2 w-full bg-white/20" />
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group hover:-translate-y-1 bg-gradient-to-br from-green-500 to-emerald-600">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/80 uppercase tracking-wider">Publiées</CardTitle>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform">
              <Eye className="h-6 w-6 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-2">
            <div className="text-5xl font-black text-white">{publishedCount}</div>
            <p className="text-sm text-white/80 mt-2 font-medium">
              Visibles au public
            </p>
          </CardContent>
          <div className="h-2 w-full bg-white/20" />
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group hover:-translate-y-1 bg-gradient-to-br from-amber-500 to-orange-600">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/80 uppercase tracking-wider">Brouillons</CardTitle>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-2">
            <div className="text-5xl font-black text-white">{draftCount}</div>
            <p className="text-sm text-white/80 mt-2 font-medium">
              En préparation
            </p>
          </CardContent>
          <div className="h-2 w-full bg-white/20" />
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group hover:-translate-y-1 bg-gradient-to-br from-red-500 to-rose-600">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/80 uppercase tracking-wider">Clôturées</CardTitle>
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform">
              <XCircle className="h-6 w-6 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-2">
            <div className="text-5xl font-black text-white">{closedCount}</div>
            <p className="text-sm text-white/80 mt-2 font-medium">
              Terminées
            </p>
          </CardContent>
          <div className="h-2 w-full bg-white/20" />
        </Card>
      </div>

      {/* Jobs List with Filters */}
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 shadow-xl border border-slate-700">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Liste des offres</h2>
              <p className="text-slate-300 text-sm font-medium mt-1">
                {jobsList.length} {jobsList.length > 1 ? "offres disponibles" : "offre disponible"}
              </p>
            </div>
          </div>
        </div>
        <DashboardClient jobs={jobsList} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-9 w-64 bg-muted animate-pulse rounded" />
          <div className="h-5 w-96 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-11 w-40 bg-muted animate-pulse rounded" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Jobs List Skeleton */}
      <div className="space-y-4">
        <div className="h-7 w-32 bg-muted animate-pulse rounded" />
        <JobsListSkeleton />
      </div>
    </div>
  );
}
