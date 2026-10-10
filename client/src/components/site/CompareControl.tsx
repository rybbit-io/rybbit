"use client";

import { GitCompareArrows } from "lucide-react";
import { useExtracted } from "next-intl";
import { describeComparisonWindow } from "@/components/DateSelector/rangeFields";
import { ComparisonMode } from "@/components/DateSelector/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore, useTimezone } from "@/lib/store";
import { availableComparisonModes, resolveComparison } from "@/lib/time";
import { ControlButton } from "./ControlButton";

/**
 * The analysis bar's first control: what the page's numbers are compared
 * against. It reads and writes the dashboard's one comparison (the store's
 * `comparison`, the same choice the date panel edits and the URL carries), so
 * turning it off here removes every delta and comparison line on every page:
 * `previousTime` becomes null, `useComparisonEnabled()` false, and queries
 * with `periodTime: "previous"` stop running.
 *
 * A custom window is shown and can be kept, but is only edited in the date
 * panel, where its two date fields live.
 */
export function CompareControl({ className }: { className?: string }) {
  const t = useExtracted();
  const time = useStore(state => state.time);
  const comparison = useStore(state => state.comparison);
  const setComparison = useStore(state => state.setComparison);
  const zone = useTimezone();

  const labels: Record<ComparisonMode, string> = {
    previous: t("Previous period"),
    weekday: t("Matching weekdays"),
    year: t("Same period last year"),
    custom: t("Custom range"),
    none: t("Off"),
  };

  const available = availableComparisonModes(time);
  // A stored mode the selected period cannot express resolves to the previous
  // period (see resolveComparison), so that is what the control reports.
  const mode = available.includes(comparison.mode) ? comparison.mode : "previous";
  const modes = available.filter(candidate => candidate !== "custom" || mode === "custom");

  const select = (next: string) => {
    const picked = modes.find(candidate => candidate === next);
    // Re-picking the stored mode would only drop a custom window's dates.
    if (!picked || picked === comparison.mode) return;
    setComparison({ mode: picked });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ControlButton icon={<GitCompareArrows />} label={t("Compare")} value={labels[mode]} className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuRadioGroup value={mode} onValueChange={select}>
          {modes.map(candidate => (
            <DropdownMenuRadioItem key={candidate} value={candidate} className="gap-6">
              <span className="whitespace-nowrap">{labels[candidate]}</span>
              {candidate !== "none" && (
                <span className="ml-auto whitespace-nowrap text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  {describeComparisonWindow(
                    resolveComparison(time, { ...comparison, mode: candidate }, zone),
                    time,
                    zone
                  )}
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
