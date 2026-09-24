"use client";

import type { Experiment } from "@/api/analytics/endpoints";
import type { ReactNode } from "react";
import { CreateExperimentWizard } from "./CreateExperimentWizard";

export function ExperimentDialog({
  experiment,
  experiments,
  trigger,
  open,
  onOpenChange,
}: {
  experiment?: Experiment;
  experiments: Experiment[];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <CreateExperimentWizard
      experiment={experiment}
      experiments={experiments}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
