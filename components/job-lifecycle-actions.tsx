"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Eye, XCircle, RefreshCw } from "lucide-react";
import { publishJob, closeJob, reopenJob } from "@/app/actions";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface JobLifecycleActionsProps {
  jobId: string;
  jobTitle: string;
  currentStatus: "draft" | "published" | "closed";
}

export function JobLifecycleActions({
  jobId,
  jobTitle,
  currentStatus,
}: JobLifecycleActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      const result = await publishJob(jobId);
      
      if (result.success) {
        toast({
          variant: "success",
          title: "Offre publiée",
          description: "Votre offre est maintenant visible par tous les candidats.",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Erreur de validation",
          description: result.error || "Impossible de publier l'offre.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la publication.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    setIsLoading(true);
    try {
      const result = await closeJob(jobId);
      
      if (result.success) {
        toast({
          variant: "success",
          title: "Offre clôturée",
          description: "L'offre n'est plus visible par les candidats.",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || "Impossible de clôturer l'offre.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la clôture.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopen = async () => {
    setIsLoading(true);
    try {
      const result = await reopenJob(jobId);
      
      if (result.success) {
        toast({
          variant: "success",
          title: "Offre réouverte",
          description: "L'offre est de nouveau visible par les candidats.",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || "Impossible de rouvrir l'offre.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la réouverture.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Draft status: Show Publish button
  if (currentStatus === "draft") {
    return (
      <ConfirmActionDialog
        trigger={
          <Button size="sm" disabled={isLoading}>
            <Eye className="h-4 w-4" />
            {isLoading ? "Publication..." : "Publier"}
          </Button>
        }
        title="Publier cette offre ?"
        description={`Êtes-vous sûr de vouloir publier "${jobTitle}" ? L'offre sera visible par tous les candidats.`}
        confirmText="Publier"
        onConfirm={handlePublish}
      />
    );
  }

  // Published status: Show Close button
  if (currentStatus === "published") {
    return (
      <ConfirmActionDialog
        trigger={
          <Button variant="outline" size="sm" disabled={isLoading}>
            <XCircle className="h-4 w-4" />
            {isLoading ? "Clôture..." : "Clôturer"}
          </Button>
        }
        title="Clôturer cette offre ?"
        description={`Êtes-vous sûr de vouloir clôturer "${jobTitle}" ? L'offre ne sera plus visible par les candidats.`}
        confirmText="Clôturer"
        variant="destructive"
        onConfirm={handleClose}
      />
    );
  }

  // Closed status: Show Reopen button
  if (currentStatus === "closed") {
    return (
      <ConfirmActionDialog
        trigger={
          <Button variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            {isLoading ? "Réouverture..." : "Rouvrir"}
          </Button>
        }
        title="Rouvrir cette offre ?"
        description={`Êtes-vous sûr de vouloir rouvrir "${jobTitle}" ? L'offre sera de nouveau visible par les candidats.`}
        confirmText="Rouvrir"
        onConfirm={handleReopen}
      />
    );
  }

  return null;
}
