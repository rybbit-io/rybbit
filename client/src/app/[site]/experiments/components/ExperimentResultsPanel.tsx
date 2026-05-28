"use client";

import type { Experiment, ExperimentVariantResult } from "@/api/analytics/endpoints";
import { useExperimentResults } from "@/api/analytics/hooks/experiments/useExperiments";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useExtracted } from "next-intl";
import { formatPercent, getVariantKeys } from "../lib/experimentHelpers";

function VariantResultRow({ result }: { result: ExperimentVariantResult }) {
  const t = useExtracted();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem_7rem] items-center gap-3 border-t border-neutral-100 px-3 py-2 text-sm dark:border-neutral-850">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-xs font-medium">{result.variant}</span>
        {result.isControl && <Badge variant="secondary">{t("Control")}</Badge>}
      </div>
      <span className="text-right tabular-nums text-neutral-700 dark:text-neutral-200">
        {result.sessions.toLocaleString()}
      </span>
      <span className="text-right tabular-nums text-neutral-700 dark:text-neutral-200">
        {formatPercent(result.conversionRate)}
      </span>
      <span
        className={cn(
          "text-right tabular-nums",
          result.lift === null
            ? "text-neutral-400"
            : result.lift >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
        )}
      >
        {result.lift === null ? "-" : `${result.lift >= 0 ? "+" : ""}${formatPercent(result.lift)}`}
      </span>
    </div>
  );
}

export function ExperimentResultsPanel({ experiment }: { experiment: Experiment }) {
  const t = useExtracted();
  const { data, isLoading } = useExperimentResults(experiment.experimentId, !!experiment.primaryGoalId);
  const fallbackVariants = getVariantKeys(experiment);

  if (!experiment.primaryGoalId) {
    return (
      <div className="rounded-md border border-dashed border-neutral-200 px-3 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        {t("Add a primary goal to calculate experiment conversions.")}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-2">
        <div className="h-8 rounded-md bg-neutral-100 dark:bg-neutral-850" />
        <div className="h-8 rounded-md bg-neutral-100 dark:bg-neutral-850" />
      </div>
    );
  }

  const results =
    data?.variants ||
    fallbackVariants.map(variant => ({
      variant,
      sessions: 0,
      exposures: 0,
      conversions: 0,
      conversionRate: 0,
      lift: null,
      isControl: variant === "control",
    }));

  return (
    <div className="overflow-hidden rounded-md border border-neutral-100 dark:border-neutral-850">
      <div className="grid grid-cols-[minmax(0,1fr)_6rem_6rem_7rem] gap-3 bg-neutral-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
        <span>{t("Variant")}</span>
        <span className="text-right">{t("Sessions")}</span>
        <span className="text-right">{t("Conv. rate")}</span>
        <span className="text-right">{t("Lift")}</span>
      </div>
      {results.map(result => (
        <VariantResultRow key={result.variant} result={result} />
      ))}
    </div>
  );
}
