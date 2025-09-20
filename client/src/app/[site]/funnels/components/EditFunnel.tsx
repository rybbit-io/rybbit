"use client";

import { FunnelStep, useGetFunnel, useSaveFunnel } from "../../../../api/analytics/funnels/useGetFunnel";
import { SavedFunnel } from "../../../../api/analytics/funnels/useGetFunnels";
import { Time } from "@/components/DateSelector/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getStartAndEndDate } from "../../../../api/utils";
import { Filter } from "@rybbit/shared";
import { FunnelForm } from "./FunnelForm";

interface EditFunnelDialogProps {
  funnel: SavedFunnel;
  isOpen: boolean;
  onClose: () => void;
}

export function EditFunnelDialog({ funnel, isOpen, onClose }: EditFunnelDialogProps) {
  // Time state - initialized from funnel configuration
  const [time, setTime] = useState<Time>({
    mode: "range",
    startDate: DateTime.now().minus({ days: 7 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "Last 7 days",
  });

  // Funnel steps state - initialized from funnel
  const [steps, setSteps] = useState<FunnelStep[]>(funnel.steps);

  // Funnel filters state - initialized from funnel
  const [filters, setFilters] = useState<Filter[]>(funnel.filters || []);

  // Funnel name - initialized from funnel
  const [name, setName] = useState(funnel.name);

  const { startDate, endDate } = getStartAndEndDate(time);

  // Funnel analysis query
  const {
    data,
    isError,
    error,
    isLoading: isPending,
  } = useGetFunnel(
    {
      steps,
      startDate,
      endDate,
      filters,
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

  // Update funnel
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

    // Get dates based on time selection
    let startDate = "",
      endDate = "";

    if (time.mode === "range") {
      startDate = time.startDate;
      endDate = time.endDate;
    } else if (time.mode === "day") {
      startDate = time.day;
      endDate = time.day;
    } else if (time.mode === "week") {
      startDate = time.week;
      const endDateValue = DateTime.fromISO(time.week).plus({ days: 6 }).toISODate();
      endDate = endDateValue || DateTime.now().toISODate();
    } else if (time.mode === "month") {
      startDate = time.month;
      const endDateValue = DateTime.fromISO(time.month).endOf("month").toISODate();
      endDate = endDateValue || DateTime.now().toISODate();
    } else if (time.mode === "year") {
      startDate = time.year;
      const endDateValue = DateTime.fromISO(time.year).endOf("year").toISODate();
      endDate = endDateValue || DateTime.now().toISODate();
    } else {
      // Fall back to last 7 days for all-time
      startDate = DateTime.now().minus({ days: 7 }).toISODate();
      endDate = DateTime.now().toISODate();
    }

    // Update funnel with the report ID
    saveFunnel(
      {
        steps,
        startDate,
        endDate,
        name,
        reportId: funnel.id,
        filters: filters.length > 0 ? filters : undefined,
      },
      {
        onSuccess: () => {
          // Close dialog on successful save
          onClose();
          // Show success message
          toast?.success("Funnel updated successfully");
        },
        onError: error => {
          // Show error but don't close dialog
          toast?.error(`Failed to update funnel: ${error.message}`);
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
          <DialogTitle>Edit Funnel</DialogTitle>
        </DialogHeader>

        <FunnelForm
          name={name}
          setName={setName}
          steps={steps}
          setSteps={setSteps}
          time={time}
          setTime={setTime}
          filters={filters}
          setFilters={setFilters}
          onSave={handleUpdateFunnel}
          onCancel={onClose}
          onQuery={handleQueryFunnel}
          saveButtonText="Update Funnel"
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
