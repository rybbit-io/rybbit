"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";

import type { Experiment } from "@/api/analytics/endpoints";
import { useExperimentResults, useUpdateExperiment } from "@/api/analytics/hooks/experiments/useExperiments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { formatPercent, getExperimentVerdict, getVariantKeys } from "../lib/experimentHelpers";

export function CompleteExperimentDialog({
  experiment,
  open,
  onOpenChange,
}: {
  experiment: Experiment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useExtracted();
  const updateMutation = useUpdateExperiment();
  const { data } = useExperimentResults(experiment.experimentId, open && !!experiment.primaryGoalId, "experiment");

  const results = data?.variants ?? [];
  const { control, statsByVariant, leader } = getExperimentVerdict(experiment, results);
  const variantKeys = results.length > 0 ? results.map(result => result.variant) : getVariantKeys(experiment);
  const recommended = leader?.variant ?? control?.variant ?? variantKeys.find(key => key === "control") ?? variantKeys[0];
  const [choice, setChoice] = useState<string | null>(null);
  const selected = choice ?? recommended;

  const complete = async () => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        experimentId: experiment.experimentId,
        payload: { status: "completed", winningVariant: selected },
      });
      toast.success(t("Rolled out {variant}", { variant: selected }));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Failed to update experiment"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Complete experiment")}</DialogTitle>
          <DialogDescription>
            {t(
              "Pick the variant to roll out. The {flagKey} flag will serve it to everyone it targets, and results stop collecting.",
              { flagKey: experiment.featureFlag.key }
            )}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={setChoice} className="gap-1.5">
          {variantKeys.map(variant => {
            const result = results.find(item => item.variant === variant);
            const stats = statsByVariant.get(variant);
            return (
              <label
                key={variant}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
                  selected === variant
                    ? "border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-850"
                    : "border-neutral-100 hover:bg-neutral-50 dark:border-neutral-850 dark:hover:bg-neutral-900"
                )}
              >
                <RadioGroupItem value={variant} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm text-neutral-900 dark:text-neutral-50">{variant}</span>
                    {variant === recommended && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {t("Recommended")}
                      </span>
                    )}
                  </span>
                  {result && (
                    <span className="mt-0.5 block text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {formatPercent(result.conversionRate)}
                      {stats &&
                        ` · ${t("{chance}% chance to beat control", {
                          chance: (stats.chanceToBeatControl * 100).toFixed(1),
                        })}`}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </RadioGroup>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="success" onClick={complete} disabled={!selected || updateMutation.isPending}>
            {t("Complete and roll out {variant}", { variant: selected ?? "" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
