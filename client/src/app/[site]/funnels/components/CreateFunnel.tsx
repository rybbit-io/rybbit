"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGetFunnel, useSaveFunnel } from "../../../../api/analytics/hooks/funnels/useGetFunnel";
import { FunnelStep } from "../../../../api/analytics/endpoints";
import { FunnelForm } from "./FunnelForm";

export function CreateFunnelDialog() {
  const [open, setOpen] = useState(false);

  // Funnel steps state
  const [steps, setSteps] = useState<FunnelStep[]>([
    { type: "page", value: "/", name: "Homepage" },
    { type: "page", value: "", name: "" },
  ]);

  // Funnel name
  const [name, setName] = useState("New Funnel");

  // Funnel analysis query
  const {
    data,
    isError,
    error,
    isLoading: isPending,
  } = useGetFunnel(
    steps.some(step => !step.value)
      ? undefined
      : {
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

  // Save funnel configuration
  const handleSaveFunnel = () => {
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

    // Save funnel directly without analyzing
    saveFunnel(
      {
        steps,
        name,
      },
      {
        onSuccess: () => {
          // Close dialog on successful save
          setOpen(false);
          // Optional: Show success message
          toast?.success("Funnel saved successfully");
        },
        onError: error => {
          // Show error but don't close dialog
          toast?.error(`Failed to save funnel: ${error.message}`);
        },
      }
    );
  };

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSteps([
        { type: "page", value: "/", name: "Homepage" },
        { type: "page", value: "", name: "" },
      ]);
      setName("New Funnel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex gap-2">
          <Plus className="w-4 h-4" /> Create Funnel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Create Funnel</DialogTitle>
        </DialogHeader>

        <FunnelForm
          name={name}
          setName={setName}
          steps={steps}
          setSteps={setSteps}
          onSave={handleSaveFunnel}
          onCancel={() => setOpen(false)}
          onQuery={handleQueryFunnel}
          saveButtonText="Save Funnel"
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
