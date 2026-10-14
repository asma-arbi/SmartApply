"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/job-status-badge";
import { DeleteJobDialog } from "@/components/delete-job-dialog";
import { JobLifecycleActions } from "@/components/job-lifecycle-actions";
import { DashboardFilters } from "@/components/dashboard-filters";
import { EmptyState } from "@/components/empty-state";
import { MapPin, Calendar, Briefcase, Edit, Filter } from "lucide-react";

interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
  status: "draft" | "published" | "closed";
  created_at: string;
}

interface DashboardClientProps {
  jobs: Job[];
}

const ITEMS_PER_PAGE = 10;

export function DashboardClient({ jobs }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Extract unique locations
  const availableLocations = useMemo(() => {
    const locations = Array.from(new Set(jobs.map((job) => job.location)));
    return locations.sort();
  }, [jobs]);

  // Check if filters are active
  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    locationFilter !== "all" ||
    sortBy !== "date-desc";

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setLocationFilter("all");
    setSortBy("date-desc");
    setCurrentPage(1);
  };

  // Filter and sort jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Search filter
    if (searchQuery) {
      result = result.filter((job) =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((job) => job.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((job) => job.type === typeFilter);
    }

    // Location filter
    if (locationFilter !== "all") {
      result = result.filter((job) => job.location === locationFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [jobs, searchQuery, statusFilter, typeFilter, locationFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Handle no jobs at all
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Aucune offre d'emploi"
        description="Vous n'avez pas encore publié d'offre. Créez votre première offre pour commencer à recruter."
        action={{
          label: "Créer une offre",
          href: "/dashboard/jobs/new",
        }}
      />
    );
  }

  // Handle no results after filtering
  const showNoResults = filteredJobs.length === 0 && hasActiveFilters;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <DashboardFilters
        searchQuery={searchQuery}
        onSearchChange={handleFilterChange(setSearchQuery)}
        statusFilter={statusFilter}
        onStatusFilterChange={handleFilterChange(setStatusFilter)}
        typeFilter={typeFilter}
        onTypeFilterChange={handleFilterChange(setTypeFilter)}
        locationFilter={locationFilter}
        onLocationFilterChange={handleFilterChange(setLocationFilter)}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        availableLocations={availableLocations}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* Results Count */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-1 bg-gradient-to-b from-primary to-blue-600 rounded-full" />
          <p className="text-base font-bold text-slate-900">
            {filteredJobs.length === 1
              ? "1 offre trouvée"
              : `${filteredJobs.length} offres trouvées`}
            {filteredJobs.length !== jobs.length && (
              <span className="text-muted-foreground font-normal ml-1">
                sur {jobs.length} au total
              </span>
            )}
          </p>
        </div>
        {totalPages > 1 && (
          <p className="text-sm font-semibold text-muted-foreground bg-slate-100 px-4 py-2 rounded-lg">
            Page {currentPage} sur {totalPages}
          </p>
        )}
      </div>

      {/* No Results State */}
      {showNoResults ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Filter className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Aucun résultat</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Aucune offre ne correspond à vos critères de recherche. Essayez de modifier vos
              filtres.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Réinitialiser les filtres
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Jobs List */}
          <div className="space-y-4">
            {paginatedJobs.map((job) => (
              <Card key={job.id} className="group relative overflow-hidden border-2 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-slate-50/50">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="text-xl font-bold hover:text-primary transition-colors line-clamp-1 group-hover:underline decoration-2 underline-offset-4"
                          >
                            {job.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg font-medium group-hover:bg-primary/10 transition-colors">
                              <MapPin className="h-4 w-4 text-primary" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg font-medium group-hover:bg-primary/10 transition-colors">
                              <Briefcase className="h-4 w-4 text-primary" />
                              {job.type}
                            </span>
                            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg font-medium group-hover:bg-primary/10 transition-colors">
                              <Calendar className="h-4 w-4 text-primary" />
                              {new Date(job.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <JobStatusBadge status={job.status} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="hover:bg-primary hover:text-white hover:border-primary transition-all font-medium shadow-sm hover:shadow-md">
                        <Link href={`/dashboard/jobs/${job.id}`}>
                          <Edit className="h-4 w-4" />
                          Modifier
                        </Link>
                      </Button>
                      <JobLifecycleActions
                        jobId={job.id}
                        jobTitle={job.title}
                        currentStatus={job.status}
                      />
                      <DeleteJobDialog jobId={job.id} jobTitle={job.title} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-10 px-6 font-medium border-2 hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1);

                  if (!showPage) {
                    // Show ellipsis
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-muted-foreground font-bold">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 font-bold border-2 transition-all ${
                        currentPage === page
                          ? "bg-primary shadow-lg shadow-primary/30"
                          : "hover:bg-primary/10 hover:border-primary"
                      }`}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-10 px-6 font-medium border-2 hover:bg-primary hover:text-white hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
