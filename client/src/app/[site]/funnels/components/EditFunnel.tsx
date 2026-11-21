"use client";

import { useExtracted } from "next-intl";
import { Dialog, DialogContentFullScreen } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useGetFunnel, useSaveFunnel } from "../../../../api/analytics/hooks/funnels/useGetFunnel";
import { FunnelStep, hasIncompleteSteps, SavedFunnel } from "../../../../api/analytics/endpoints";
import { FunnelForm } from "./FunnelForm";

interface EditFunnelDialogProps {
  funnel: SavedFunnel;
  isOpen: boolean;
  onClose: () => void;
  isCloneMode?: boolean;
}

export function EditFunnelDialog({ funnel, isOpen, onClose, isCloneMode = false }: EditFunnelDialogProps) {
  const t = useExtracted();
  // Funnel steps state - initialized from funnel
  const [steps, setSteps] = useState<FunnelStep[]>(funnel.steps);

  // Funnel name - initialized from funnel, with "(Copy)" suffix for clone mode
  const [name, setName] = useState(isCloneMode ? `${funnel.name} (Copy)` : funnel.name);

  // Funnel analysis query (drives the live preview)
  const {
    data,
    isError,
    error,
    isLoading: isPending,
  } = useGetFunnel(hasIncompleteSteps(steps) ? undefined : { steps }, true);

  // Funnel save mutation
  const { mutate: saveFunnel, isPending: isSaving } = useSaveFunnel();

  // Update or clone funnel (the save button is disabled while invalid)
  const handleUpdateFunnel = () => {
    if (!name.trim() || hasIncompleteSteps(steps)) return;

    saveFunnel(
      {
        steps,
        name,
        reportId: isCloneMode ? undefined : funnel.id,
      },
      {
        onSuccess: () => {
          onClose();
          toast?.success(isCloneMode ? t("Funnel cloned successfully") : t("Funnel updated successfully"));
        },
        onError: error => {
          // Show error but don't close the editor
          toast?.error(
            isCloneMode
              ? t("Failed to clone funnel: {message}", { message: error.message })
              : t("Failed to update funnel: {message}", { message: error.message })
          );
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContentFullScreen
        aria-describedby={undefined}
        onOpenAutoFocus={e => {
          e.preventDefault();
          document.getElementById("funnel-name-input")?.focus();
        }}
      >
        <FunnelForm
          title={isCloneMode ? t("Clone Funnel") : t("Edit Funnel")}
          name={name}
          setName={setName}
          steps={steps}
          setSteps={setSteps}
          onSave={handleUpdateFunnel}
          onCancel={onClose}
          saveButtonText={isCloneMode ? t("Clone Funnel") : t("Update Funnel")}
          isSaving={isSaving}
          isError={isError}
          isPending={isPending}
          error={error}
          funnelData={data}
        />
      </DialogContentFullScreen>
    </Dialog>
  );
}
