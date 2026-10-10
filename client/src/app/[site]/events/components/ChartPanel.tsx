"use client";

import { TimeBucket } from "@rybbit/shared";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore, useTimezone } from "@/lib/store";
import { getAbsoluteBounds } from "@/lib/time";

interface ChartPanelProps {
  title: string;
  isLoading: boolean;
  /** Shown in place of the chart: nothing in the period, or every series hidden. */
  placeholder?: { title: string; description?: string } | null;
  chart: ReactNode;
  legend: ReactNode;
}

/** "Sep 1 – Sep 30", or one date for a single day. Null for all time. */
function useRangeLabel(): string | null {
  const time = useStore(state => state.time);
  const zone = useTimezone();
  const bounds = getAbsoluteBounds(time, zone);
  if (!bounds) return null;

  const start = bounds.start.toFormat("MMM d");
  const end = bounds.end.minus({ minutes: 1 }).toFormat("MMM d");
  return start === end ? start : `${start} – ${end}`;
}

/** The chart card's two halves: the plot under its title, and the legend table beside it. */
export function ChartPanel({ title, isLoading, placeholder, chart, legend }: ChartPanelProps) {
  const t = useExtracted();
  const bucket = useStore(state => state.bucket);
  const range = useRangeLabel();

  const perBucket: Record<TimeBucket, string> = {
    minute: t("per minute"),
    five_minutes: t("per 5 minutes"),
    ten_minutes: t("per 10 minutes"),
    fifteen_minutes: t("per 15 minutes"),
    hour: t("per hour"),
    day: t("per day"),
    week: t("per week"),
    month: t("per month"),
    year: t("per year"),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 p-2 pb-3 md:p-4 md:pb-3">
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-2 pt-2 md:px-0 md:pt-0">
          <h2 className="text-base font-semibold leading-none tracking-tight">{title}</h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {range ? `${perBucket[bucket]}, ${range}` : perBucket[bucket]}
          </span>
        </div>
        <div className="h-[260px] w-full">
          {isLoading ? (
            <div className="flex h-full items-end pb-7 pl-10 pr-5 pt-3">
              <Skeleton className="h-full w-full rounded-md" />
            </div>
          ) : placeholder ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-neutral-500 dark:text-neutral-400">
                <p className="text-sm font-medium">{placeholder.title}</p>
                {placeholder.description && <p className="text-xs">{placeholder.description}</p>}
              </div>
            </div>
          ) : (
            chart
          )}
        </div>
      </div>
      <div className="border-t border-neutral-100 p-2 dark:border-neutral-850 lg:border-l lg:border-t-0">{legend}</div>
    </div>
  );
}
