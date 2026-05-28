"use client";

import type { Experiment, ExperimentStatus } from "@/api/analytics/endpoints";
import { useDeleteExperiment, useUpdateExperiment } from "@/api/analytics/hooks/experiments/useExperiments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { ExperimentDialog } from "./ExperimentDialog";
import { ExperimentResultsPanel } from "./ExperimentResultsPanel";
import { StatusBadge } from "./StatusBadge";

export function ExperimentRow({ experiment, experiments }: { experiment: Experiment; experiments: Experiment[] }) {
  const t = useExtracted();
  const deleteMutation = useDeleteExperiment();
  const updateMutation = useUpdateExperiment();
  const [editOpen, setEditOpen] = useState(false);
  const primaryGoalName =
    experiment.primaryGoal?.name || (experiment.primaryGoalId ? t("Untitled goal") : t("No goal"));

  const handleDelete = async () => {
    if (!window.confirm(t("Delete this experiment?"))) return;

    try {
      await deleteMutation.mutateAsync(experiment.experimentId);
      toast.success(t("Experiment deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to delete experiment"));
    }
  };

  const setStatus = async (status: ExperimentStatus) => {
    try {
      await updateMutation.mutateAsync({ experimentId: experiment.experimentId, payload: { status } });
      toast.success(t("Experiment updated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to update experiment"));
    }
  };

  return (
    <div className="rounded-lg border border-neutral-100 bg-white dark:border-neutral-850 dark:bg-neutral-900">
      <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 dark:border-neutral-850 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-medium text-neutral-900 dark:text-neutral-50">{experiment.name}</h3>
            <StatusBadge status={experiment.status} />
            {experiment.winningVariant && (
              <Badge variant="success">
                {t("Winner")}: {experiment.winningVariant}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span>
              {t("Flag")}:{" "}
              <code className="font-mono text-neutral-700 dark:text-neutral-200">{experiment.featureFlag.key}</code>
            </span>
            <span>
              {t("Goal")}: <span className="text-neutral-700 dark:text-neutral-200">{primaryGoalName}</span>
            </span>
          </div>
          {experiment.hypothesis && (
            <p className="mt-2 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">{experiment.hypothesis}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {experiment.status !== "running" && experiment.status !== "completed" && (
            <Button size="sm" onClick={() => setStatus("running")} disabled={updateMutation.isPending}>
              {t("Start")}
            </Button>
          )}
          {experiment.status === "running" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStatus("paused")}
              disabled={updateMutation.isPending}
            >
              {t("Pause")}
            </Button>
          )}
          {experiment.status !== "completed" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStatus("completed")}
              disabled={updateMutation.isPending}
            >
              {t("Complete")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="smIcon" variant="ghost" aria-label={t("Actions")}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t("Edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={deleteMutation.isPending}
                onSelect={handleDelete}
                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4">
        <ExperimentResultsPanel experiment={experiment} />
      </div>

      <ExperimentDialog experiment={experiment} experiments={experiments} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
