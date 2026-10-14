"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, MapPin, Briefcase, Calendar, Building2 } from "lucide-react";

interface JobPreviewDialogProps {
  job: {
    title: string;
    location: string;
    type: string;
    description: string;
  };
  companyName?: string;
}

export function JobPreviewDialog({ job, companyName }: JobPreviewDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="lg">
          <Eye className="h-4 w-4" />
          Prévisualiser
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aperçu de l&apos;offre</DialogTitle>
        </DialogHeader>
        
        {/* Preview Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Job Header */}
            <div>
              <h2 className="text-3xl font-bold mb-3">{job.title || "Titre de l'offre"}</h2>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {companyName && (
                  <span className="flex items-center gap-2 text-base">
                    <Building2 className="h-5 w-5" />
                    <span className="font-medium text-foreground">
                      {companyName}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {job.location || "Localisation"}
                </span>
                <span className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  {job.type || "CDI"}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {new Date().toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <Separator />

            {/* Job Description */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Description du poste</h3>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                  {job.description || "Description du poste..."}
                </p>
              </div>
            </div>

            {job.description && job.description.length < 50 && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <p className="text-sm text-orange-800">
                  ⚠️ La description est trop courte ({job.description.length} caractères). 
                  Minimum requis: 50 caractères.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          Ceci est un aperçu de votre offre telle qu&apos;elle apparaîtra aux candidats
        </p>
      </DialogContent>
    </Dialog>
  );
}
