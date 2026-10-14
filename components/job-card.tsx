import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { JobStatusBadge } from "@/components/job-status-badge";
import { MapPin, Building2, Calendar, Briefcase } from "lucide-react";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    location: string;
    type: string;
    status: "draft" | "published" | "closed";
    created_at: string;
    companies?: {
      name: string;
    } | null;
  };
  href: string;
  showStatus?: boolean;
}

export function JobCard({ job, href, showStatus = false }: JobCardProps) {
  return (
    <Link href={href}>
      <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 border-2 hover:border-blue-500/50 bg-gradient-to-br from-white to-gray-50/50">
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:via-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
        
        <CardContent className="relative p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-bold text-xl mb-3 line-clamp-1 group-hover:text-blue-600 transition-colors duration-300">
                  {job.title}
                </h3>
                <div className="flex flex-wrap items-center gap-5 text-sm">
                  {job.companies?.name && (
                    <span className="flex items-center gap-2 font-semibold text-gray-900">
                      <div className="relative p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      {job.companies.name}
                    </span>
                  )}
                  <span className="flex items-center gap-2 text-gray-600 font-medium">
                    <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                      <MapPin className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
                    </div>
                    {job.location}
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full font-semibold text-xs border border-green-200">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.type}
                  </span>
                  <span className="flex items-center gap-2 text-gray-500 text-xs">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(job.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
            {showStatus && (
              <div className="flex-shrink-0">
                <JobStatusBadge status={job.status} />
              </div>
            )}
          </div>
        </CardContent>

        {/* Bottom colored border */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
      </Card>
    </Link>
  );
}
