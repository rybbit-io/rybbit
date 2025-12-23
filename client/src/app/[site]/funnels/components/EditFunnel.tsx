"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGetFunnel, useSaveFunnel } from "../../../../api/analytics/hooks/funnels/useGetFunnel";
import { FunnelStep, SavedFunnel } from "../../../../api/analytics/endpoints";
import { FunnelForm } from "./FunnelForm";

interface EditFunnelDialogProps {
  funnel: SavedFunnel;
  isOpen: boolean;
  onClose: () => void;
  isCloneMode?: boolean;
}

export function EditFunnelDialog({ funnel, isOpen, onClose, isCloneMode = false }: EditFunnelDialogProps) {
  // Funnel steps state - initialized from funnel
  const [steps, setSteps] = useState<FunnelStep[]>(funnel.steps);

  // Funnel name - initialized from funnel, with "(Copy)" suffix for clone mode
  const [name, setName] = useState(isCloneMode ? `${funnel.name} (Copy)` : funnel.name);

  // Funnel analysis query
  const {
    data,
    isError,
    error,
    isLoading: isPending,
  } = useGetFunnel(
    {
      steps,
    },
    true
  );

  // Funnel save mutation
  const { mutate: saveFunnel, isPending: isSaving, error: saveError } = useSaveFunnel();

  // Query funnel without saving
  const handleQueryFunnel = () => {
    // Validate steps have values
    const hasEmptySteps = steps.some(step => !step.value);
    if (hasEmptySteps) {
      alert("All steps must have values");
      return;
    }
  };

  // Update or clone funnel
  const handleUpdateFunnel = () => {
    // Validate name
    if (!name.trim()) {
      alert("Please enter a funnel name");
      return;
    }

    // Validate steps have values
    const hasEmptySteps = steps.some(step => !step.value);
    if (hasEmptySteps) {
      alert("All steps must have values");
      return;
    }

    // Update funnel with the report ID (or create new if cloning)
    saveFunnel(
      {
        steps,
        name,
        reportId: isCloneMode ? undefined : funnel.id,
      },
      {
        onSuccess: () => {
          // Close dialog on successful save
          onClose();
          // Show success message
          toast?.success(isCloneMode ? "Funnel cloned successfully" : "Funnel updated successfully");
        },
        onError: error => {
          // Show error but don't close dialog
          toast?.error(`Failed to ${isCloneMode ? "clone" : "update"} funnel: ${error.message}`);
        },
      }
    );
  };

  // Load existing funnel data on first render
  useEffect(() => {
    // Pre-load the funnel visualization
    handleQueryFunnel();
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{isCloneMode ? "Clone Funnel" : "Edit Funnel"}</DialogTitle>
        </DialogHeader>

        <FunnelForm
          name={name}
          setName={setName}
          steps={steps}
          setSteps={setSteps}
          onSave={handleUpdateFunnel}
          onCancel={onClose}
          onQuery={handleQueryFunnel}
          saveButtonText={isCloneMode ? "Clone Funnel" : "Update Funnel"}
          isSaving={isSaving}
          isError={isError}
          isPending={isPending}
          error={error}
          saveError={saveError}
          funnelData={data}
        />
      </DialogContent>
    </Dialog>
  );
}
