"use client";

import {
  FunnelStep,
  useGetFunnel,
  useSaveFunnel,
} from "../../../../api/analytics/funnels/useGetFunnel";
import { Time } from "@/components/DateSelector/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { toast } from "sonner";
import { getStartAndEndDate } from "../../../../api/utils";
import { FunnelForm } from "./FunnelForm";
import { Filter } from "@rybbit/shared";

export function CreateFunnelDialog() {
  const [open, setOpen] = useState(false);

  // Initial date state - last 7 days
  const [time, setTime] = useState<Time>({
    mode: "range",
    startDate: DateTime.now().minus({ days: 7 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "Last 7 days",
  });

  // Funnel steps state
  const [steps, setSteps] = useState<FunnelStep[]>([
    { type: "page", value: "/", name: "Homepage" },
    { type: "page", value: "", name: "" },
  ]);

  // Funnel filters state
  const [filters, setFilters] = useState<Filter[]>([]);

  // Funnel name
  const [name, setName] = useState("New Funnel");

  const { startDate, endDate } = getStartAndEndDate(time);

  // Funnel analysis query
  const {
    data,
    isError,
    error,
    isLoading: isPending,
  } = useGetFunnel(
    steps.some((step) => !step.value)
      ? undefined
      : {
          steps,
          startDate,
          endDate,
          filters,
        },
    true
  );

  // Funnel save mutation
  const {
    mutate: saveFunnel,
    isPending: isSaving,
    error: saveError,
  } = useSaveFunnel();

  // Query funnel without saving
  const handleQueryFunnel = () => {
    // Validate steps have values
    const hasEmptySteps = steps.some((step) => !step.value);
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
    const hasEmptySteps = steps.some((step) => !step.value);
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
      const endDateValue = DateTime.fromISO(time.week)
        .plus({ days: 6 })
        .toISODate();
      endDate = endDateValue || DateTime.now().toISODate();
    } else if (time.mode === "month") {
      startDate = time.month;
      const endDateValue = DateTime.fromISO(time.month)
        .endOf("month")
        .toISODate();
      endDate = endDateValue || DateTime.now().toISODate();
    } else if (time.mode === "year") {
      startDate = time.year;
      const endDateValue = DateTime.fromISO(time.year)
        .endOf("year")
        .toISODate();
      endDate = endDateValue || DateTime.now().toISODate();
    } else {
      // Fall back to last 7 days for all-time
      startDate = DateTime.now().minus({ days: 7 }).toISODate();
      endDate = DateTime.now().toISODate();
    }

    // Save funnel directly without analyzing
    saveFunnel(
      {
        steps,
        startDate,
        endDate,
        name,
        filters: filters.length > 0 ? filters : undefined,
      },
      {
        onSuccess: () => {
          // Close dialog on successful save
          setOpen(false);
          // Optional: Show success message
          toast?.success("Funnel saved successfully");
        },
        onError: (error) => {
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
      setFilters([]);
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
          time={time}
          setTime={setTime}
          filters={filters}
          setFilters={setFilters}
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
