"use client";

import type { Experiment, ExperimentStatus } from "@/api/analytics/endpoints";
import { useDeleteExperiment, useUpdateExperiment } from "@/api/analytics/hooks/experiments/useExperiments";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Flag, MoreHorizontal, Pause, Pencil, Play, Square, Target, Trash2, Trophy } from "lucide-react";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { formatRelativeTime } from "../lib/experimentHelpers";
import { ExperimentDialog } from "./ExperimentDialog";
import { ExperimentResultsPanel } from "./ExperimentResultsPanel";
import { StatusBadge } from "./StatusBadge";

function MetaChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
      <span className="text-neutral-400 dark:text-neutral-500">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ExperimentRow({ experiment, experiments }: { experiment: Experiment; experiments: Experiment[] }) {
  const t = useExtracted();
  const deleteMutation = useDeleteExperiment();
  const updateMutation = useUpdateExperiment();
  const [editOpen, setEditOpen] = useState(false);
  const primaryGoalName =
    experiment.primaryGoal?.name || (experiment.primaryGoalId ? t("Untitled goal") : t("No goal"));

  const startedRel = formatRelativeTime(experiment.startedAt);
  const endedRel = formatRelativeTime(experiment.endedAt);
  const createdRel = formatRelativeTime(experiment.createdAt);
  const lifecycle =
    experiment.status === "completed" && endedRel
      ? t("Ended {time}", { time: endedRel })
      : experiment.startedAt && startedRel
        ? t("Started {time}", { time: startedRel })
        : createdRel
          ? t("Created {time}", { time: createdRel })
          : null;

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

  const isRunning = experiment.status === "running";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-white dark:bg-neutral-900",
        isRunning ? "border-emerald-500/20 dark:border-emerald-500/15" : "border-neutral-100 dark:border-neutral-850"
      )}
    >
      <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 dark:border-neutral-850 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-medium text-neutral-900 dark:text-neutral-50">{experiment.name}</h3>
            <StatusBadge status={experiment.status} />
            {experiment.winningVariant && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <Trophy className="h-3 w-3" />
                <span className="font-mono">{experiment.winningVariant}</span>
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <MetaChip icon={<Flag className="h-3.5 w-3.5" />}>
              <code className="font-mono text-neutral-700 dark:text-neutral-200">{experiment.featureFlag.key}</code>
            </MetaChip>
            <MetaChip icon={<Target className="h-3.5 w-3.5" />}>
              <span className="text-neutral-700 dark:text-neutral-200">{primaryGoalName}</span>
            </MetaChip>
            {lifecycle && <span className="text-xs text-neutral-400 dark:text-neutral-500">{lifecycle}</span>}
          </div>
          {experiment.hypothesis && (
            <p className="mt-2 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">{experiment.hypothesis}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {experiment.status !== "running" && experiment.status !== "completed" && (
            <Button size="sm" onClick={() => setStatus("running")} disabled={updateMutation.isPending}>
              <Play className="h-3.5 w-3.5" />
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
              <Pause className="h-3.5 w-3.5" />
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
              <Square className="h-3.5 w-3.5" />
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
