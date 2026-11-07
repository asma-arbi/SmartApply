"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeletePostDialogProps = {
  open: boolean;
  title?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeletePostDialog({
  open,
  title,
  onOpenChange,
  onConfirm,
}: DeletePostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Supprimer cette publication ?</DialogTitle>
          <DialogDescription>
            {title
              ? `« ${title} » sera définitivement retiré du fil.`
              : "Cette publication sera définitivement retirée du fil."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
