"use client";

import { useExtracted } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContentFullScreen, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useGetFunnel, useSaveFunnel } from "../../../../api/analytics/hooks/funnels/useGetFunnel";
import { FunnelStep, hasIncompleteSteps } from "../../../../api/analytics/endpoints";
import { FunnelForm } from "./FunnelForm";

const buildDefaultSteps = (): FunnelStep[] => [
  { type: "page", value: "/", name: "Homepage" },
  { type: "page", value: "", name: "" },
];

export function CreateFunnelDialog() {
  const t = useExtracted();
  const [open, setOpen] = useState(false);

  // Funnel steps state
  const [steps, setSteps] = useState<FunnelStep[]>(buildDefaultSteps);

  // Funnel name
  const [name, setName] = useState("New Funnel");

  // Funnel analysis query (drives the live preview)
  const {
    data,
    isError,
    error,
    isLoading: isPending,
  } = useGetFunnel(hasIncompleteSteps(steps) ? undefined : { steps }, true);

  // Funnel save mutation
  const { mutate: saveFunnel, isPending: isSaving } = useSaveFunnel();

  // Save funnel configuration (the save button is disabled while invalid)
  const handleSaveFunnel = () => {
    if (!name.trim() || hasIncompleteSteps(steps)) return;

    saveFunnel(
      { steps, name },
      {
        onSuccess: () => {
          setOpen(false);
          toast?.success(t("Funnel saved successfully"));
        },
        onError: error => {
          // Show error but don't close the editor
          toast?.error(t("Failed to save funnel: {message}", { message: error.message }));
        },
      }
    );
  };

  // Reset form when the editor closes
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSteps(buildDefaultSteps());
      setName("New Funnel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex gap-2">
          <Plus className="w-4 h-4" /> {t("Create Funnel")}
        </Button>
      </DialogTrigger>
      <DialogContentFullScreen
        aria-describedby={undefined}
        onOpenAutoFocus={e => {
          e.preventDefault();
          document.getElementById("funnel-name-input")?.focus();
        }}
      >
        <FunnelForm
          title={t("Create Funnel")}
          name={name}
          setName={setName}
          steps={steps}
          setSteps={setSteps}
          onSave={handleSaveFunnel}
          onCancel={() => setOpen(false)}
          saveButtonText={t("Save Funnel")}
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
