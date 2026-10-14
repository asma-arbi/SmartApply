"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobPreviewDialog } from "@/components/job-preview-dialog";
import { ArrowLeft, Save, Eye } from "lucide-react";
import Link from "next/link";
import { saveJob } from "@/app/actions";
import { validateJobForPublish, type ValidationResult } from "@/lib/validations/job-validation";
import { useToast } from "@/components/ui/use-toast";

interface JobFormClientProps {
  job: {
    id: string;
    title: string;
    location: string;
    type: string;
    description: string;
    status: "draft" | "published" | "closed";
  } | null;
  isNew: boolean;
  companyName?: string;
}

export function JobFormClient({ job, isNew, companyName }: JobFormClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [formData, setFormData] = useState({
    title: job?.title || "",
    location: job?.location || "",
    type: job?.type || "CDI",
    description: job?.description || "",
    status: job?.status || "draft",
  });

  const [validationErrors, setValidationErrors] = useState<ValidationResult["errors"]>({});
  const [showValidation, setShowValidation] = useState(false);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof newErrors];
        return newErrors;
      });
    }
  };

  const submitWithStatus = async (targetStatus: string) => {
    setShowValidation(true);

    // If trying to publish, validate first
    if (targetStatus === "published") {
      const validation = validateJobForPublish(formData);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast({
          variant: "destructive",
          title: "Erreur de validation",
          description: "Veuillez corriger les erreurs avant de publier.",
        });
        return;
      }
    }

    if (!formRef.current) return;

    const formDataToSubmit = new FormData(formRef.current);
    formDataToSubmit.set("status", targetStatus);

    startTransition(async () => {
      try {
        await saveJob(formDataToSubmit);
        toast({
          variant: "success",
          title: "Offre enregistrée",
          description: targetStatus === "published" 
            ? "Votre offre a été publiée avec succès." 
            : "Votre offre a été enregistrée.",
        });
        router.push("/dashboard");
        router.refresh();
      } catch {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue lors de l'enregistrement.",
        });
      }
    });
  };

  const descriptionLength = formData.description.trim().length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNew ? "Publier une offre" : "Modifier l'offre"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isNew
              ? "Créez une nouvelle offre d'emploi pour votre entreprise"
              : "Modifiez les informations de votre offre d'emploi"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>Informations de l&apos;offre</CardTitle>
            <CardDescription>
              Remplissez les informations concernant le poste à pourvoir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {job && <input type="hidden" name="id" value={job.id} />}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Intitulé du poste <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                placeholder="Ex: Développeur Full Stack"
                className={validationErrors.title ? "border-destructive" : ""}
              />
              {validationErrors.title && showValidation && (
                <p className="text-sm text-destructive">{validationErrors.title}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Le titre doit être clair et descriptif (3-200 caractères)
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">
                Localisation <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={(e) => handleFieldChange("location", e.target.value)}
                placeholder="Ex: Tunis, Remote, Hybride"
                className={validationErrors.location ? "border-destructive" : ""}
              />
              {validationErrors.location && showValidation && (
                <p className="text-sm text-destructive">{validationErrors.location}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Indiquez la ville ou le mode de travail
              </p>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Type de contrat <span className="text-destructive">*</span>
              </Label>
              <Select 
                name="type" 
                value={formData.type}
                onValueChange={(value) => handleFieldChange("type", value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="CDI">CDI (Contrat à Durée Indéterminée)</SelectItem>
                  <SelectItem value="CDD">CDD (Contrat à Durée Déterminée)</SelectItem>
                  <SelectItem value="Stage">Stage</SelectItem>
                  <SelectItem value="Alternance">Alternance (Apprentissage)</SelectItem>
                  <SelectItem value="Freelance">Freelance/Subcontractor</SelectItem>
                  <SelectItem value="Internship-Private">Internship - Private institution</SelectItem>
                  <SelectItem value="Internship-School">Internship - School convention</SelectItem>
                  <SelectItem value="Project-Contract">Project Duration Contract</SelectItem>
                  <SelectItem value="Mission-Contract">Contrat de mission</SelectItem>
                  <SelectItem value="Obras-Contract">Contracto de Obras</SelectItem>
                  <SelectItem value="Appel-Contract">Contrat d&apos;appel</SelectItem>
                  <SelectItem value="CTI">CTI (Contrat à Durée Indéterminée)</SelectItem>
                  <SelectItem value="VIE">VIE (Volontariat International en Entreprise)</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.type && showValidation && (
                <p className="text-sm text-destructive">{validationErrors.type}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description du poste <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                required
                rows={12}
                value={formData.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                placeholder="Décrivez le poste, les missions, les compétences requises, les avantages..."
                className={validationErrors.description ? "border-destructive" : ""}
              />
              {validationErrors.description && showValidation && (
                <p className="text-sm text-destructive">{validationErrors.description}</p>
              )}
              <div className="flex justify-between text-xs">
                <p className="text-muted-foreground">
                  Minimum 10 caractères. Soyez précis et détaillé pour attirer les meilleurs candidats.
                </p>
                <p className={descriptionLength < 10 ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {descriptionLength} / 10 caractères minimum
                </p>
              </div>
            </div>

            {/* Status */}
            <input type="hidden" name="status" value={formData.status} />

            {/* Actions */}
            <div className="flex gap-3 pt-4 flex-wrap">
              <Button 
                type="button" 
                size="lg" 
                disabled={isPending}
                onClick={() => submitWithStatus("published")}
              >
                <Eye className="h-4 w-4" />
                {isPending ? "Enregistrement..." : (isNew ? "Publier l'offre" : "Publier")}
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                size="lg" 
                disabled={isPending}
                onClick={() => submitWithStatus("draft")}
              >
                <Save className="h-4 w-4" />
                {isPending ? "Enregistrement..." : "Enregistrer comme brouillon"}
              </Button>

              <JobPreviewDialog job={formData} companyName={companyName} />

              <Button type="button" variant="ghost" size="lg" asChild>
                <Link href="/dashboard">Annuler</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
