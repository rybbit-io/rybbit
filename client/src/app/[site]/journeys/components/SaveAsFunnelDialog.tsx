"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { FunnelStep, hasIncompleteSteps } from "@/api/analytics/endpoints";
import { useGetFunnel, useSaveFunnel } from "@/api/analytics/hooks/funnels/useGetFunnel";
import { Dialog, DialogContentFullScreen } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { FunnelForm } from "../../funnels/components/FunnelForm";

const stepsFromPath = (path: string[]): FunnelStep[] => path.map(page => ({ type: "page", value: page, name: "" }));

function FunnelEditor({ path, onClose }: { path: string[]; onClose: () => void }) {
  const t = useExtracted();
  const [steps, setSteps] = useState<FunnelStep[]>(() => stepsFromPath(path));
  const [name, setName] = useState(() => path.join(" > "));

  // Drives the live preview, as in the funnels page's own editor.
  const { data, isError, error, isLoading } = useGetFunnel(hasIncompleteSteps(steps) ? undefined : { steps }, true);
  const { mutate: saveFunnel, isPending: isSaving } = useSaveFunnel();

  const save = () => {
    if (!name.trim() || hasIncompleteSteps(steps)) return;
    saveFunnel(
      { steps, name },
      {
        onSuccess: () => {
          onClose();
          toast?.success(t("Funnel saved successfully"));
        },
        onError: saveError => {
          // Show the error but keep the editor open.
          toast?.error(t("Failed to save funnel: {message}", { message: saveError.message }));
        },
      }
    );
  };

  return (
    <FunnelForm
      title={t("Create Funnel")}
      name={name}
      setName={setName}
      steps={steps}
      setSteps={setSteps}
      onSave={save}
      onCancel={onClose}
      saveButtonText={t("Save Funnel")}
      isSaving={isSaving}
      isError={isError}
      isPending={isLoading}
      error={error}
      funnelData={data}
    />
  );
}

/**
 * The funnels page's create-funnel editor, opened with a path's pages as its
 * steps. It reuses that editor's form and hooks rather than its dialog, which
 * owns its own trigger button and default steps.
 */
export function SaveAsFunnelDialog({ path, onClose }: { path: string[] | null; onClose: () => void }) {
  return (
    <Dialog open={path !== null} onOpenChange={open => !open && onClose()}>
      <DialogContentFullScreen
        aria-describedby={undefined}
        onOpenAutoFocus={event => {
          event.preventDefault();
          document.getElementById("funnel-name-input")?.focus();
        }}
      >
        {path && <FunnelEditor key={JSON.stringify(path)} path={path} onClose={onClose} />}
      </DialogContentFullScreen>
    </Dialog>
  );
}
