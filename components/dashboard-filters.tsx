"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, ArrowUpDown } from "lucide-react";

interface DashboardFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  availableLocations: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function DashboardFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  locationFilter,
  onLocationFilterChange,
  sortBy,
  onSortByChange,
  availableLocations,
  hasActiveFilters,
  onClearFilters,
}: DashboardFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Rechercher par titre d'offre..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 pr-4 h-12 text-base border-2 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[180px] h-11 border-2 hover:border-primary/50 transition-colors font-medium">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="published">Publiée</SelectItem>
            <SelectItem value="closed">Clôturée</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-[220px] h-11 border-2 hover:border-primary/50 transition-colors font-medium">
            <SelectValue placeholder="Type de contrat" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="CDI">CDI</SelectItem>
            <SelectItem value="CDD">CDD</SelectItem>
            <SelectItem value="Stage">Stage</SelectItem>
            <SelectItem value="Alternance">Alternance</SelectItem>
            <SelectItem value="Freelance">Freelance</SelectItem>
            <SelectItem value="Internship-Private">Internship - Private</SelectItem>
            <SelectItem value="Internship-School">Internship - School</SelectItem>
            <SelectItem value="Project-Contract">Project Contract</SelectItem>
            <SelectItem value="Mission-Contract">Contrat de mission</SelectItem>
            <SelectItem value="Obras-Contract">Contracto de Obras</SelectItem>
            <SelectItem value="Appel-Contract">Contrat d&apos;appel</SelectItem>
            <SelectItem value="CTI">CTI</SelectItem>
            <SelectItem value="VIE">VIE</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Location Filter */}
        {availableLocations.length > 0 && (
          <Select value={locationFilter} onValueChange={onLocationFilterChange}>
            <SelectTrigger className="w-[180px] h-11 border-2 hover:border-primary/50 transition-colors font-medium">
              <SelectValue placeholder="Localisation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les localisations</SelectItem>
              {availableLocations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort By */}
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-[180px] h-11 border-2 hover:border-primary/50 transition-colors font-medium">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Plus récent</SelectItem>
            <SelectItem value="date-asc">Plus ancien</SelectItem>
            <SelectItem value="title-asc">Titre (A-Z)</SelectItem>
            <SelectItem value="title-desc">Titre (Z-A)</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-11 gap-2 hover:bg-destructive/10 hover:text-destructive transition-colors font-medium"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}
