import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { JobStatusBadge } from "@/components/job-status-badge";
import { JobActivityTimeline } from "@/components/job-activity-timeline";
import {
  MapPin,
  Briefcase,
  Calendar,
  Building2,
  Globe,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default async function JobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  
  // Fetch job with company details
  const { data: job } = await supabase
    .from("jobs")
    .select("*, companies(name, website, description)")
    .eq("id", params.id)
    .single();
    
  if (!job) notFound();

  // Fetch activity history for this job
  const { data: activities } = await supabase
    .from("job_activities")
    .select("*, companies(name)")
    .eq("job_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild className="hover:bg-primary/5">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
      </Button>

      {/* Main Card */}
      <Card className="shadow-xl border-2">
        <CardHeader className="space-y-6 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <CardTitle className="text-4xl leading-tight">{job.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {job.companies?.name && (
                  <span className="flex items-center gap-2 text-base">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground text-lg">
                      {job.companies.name}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5" />
                  {job.location}
                </span>
                <span className="flex items-center gap-2 text-base">
                  <Briefcase className="h-5 w-5" />
                  {job.type}
                </span>
                <span className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  {new Date(job.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            {job.status !== "published" && (
              <JobStatusBadge status={job.status} />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          {/* Job Description */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-primary" />
              Description du poste
            </h2>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-line text-muted-foreground leading-relaxed text-base">
                {job.description}
              </p>
            </div>
          </div>

          <Separator />

          {/* Company Info */}
          {job.companies && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                À propos de l&apos;entreprise
              </h2>
              <div className="space-y-4 bg-muted/30 rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-semibold text-lg">{job.companies.name}</span>
                </div>
                {job.companies.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={job.companies.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      {job.companies.website}
                    </a>
                  </div>
                )}
                {job.companies.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {job.companies.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Apply Button (Placeholder for future feature) */}
          {job.status === "published" && (
            <>
              <Separator />
              <div className="space-y-4">
                <Button size="lg" className="w-full h-14 text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                  <span className="flex items-center gap-2">
                    Postuler à cette offre
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </span>
                </Button>
                <p className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-2 px-4">
                  💼 La fonctionnalité de candidature sera bientôt disponible
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      {activities && activities.length > 0 && (
        <JobActivityTimeline activities={activities} />
      )}
    </div>
  );
}
