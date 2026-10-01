"use client";

import { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatChartDateTime } from "@/lib/dateTimeUtils";
import { useStore, useTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";

const MAX_BARS = 44;

export interface TrendPoint {
  time: string;
  conversions: number;
}

interface TrendBar {
  conversions: number;
  startTime: string;
  endTime: string;
}

/** Folds the series into at most `maxBars` bars, summing neighbours, so a long range still fits. */
export function groupTrendBars(points: TrendPoint[], maxBars = MAX_BARS): TrendBar[] {
  if (points.length === 0) return [];

  const groupSize = Math.ceil(points.length / maxBars);
  const bars: TrendBar[] = [];
  for (let i = 0; i < points.length; i += groupSize) {
    const group = points.slice(i, i + groupSize);
    bars.push({
      conversions: group.reduce((sum, point) => sum + point.conversions, 0),
      startTime: group[0].time,
      endTime: group[group.length - 1].time,
    });
  }
  return bars;
}

const formatBarTime = (bar: TrendBar, bucket: TimeBucket, timezone: string) => {
  const start = formatChartDateTime(DateTime.fromSQL(bar.startTime, { zone: timezone }), bucket);
  const end = formatChartDateTime(DateTime.fromSQL(bar.endTime, { zone: timezone }), bucket);
  return start === end ? start : `${start} - ${end}`;
};

/**
 * Conversions per interval as a row of small bars. The tallest bar fills the
 * height, so the shape is comparable within a goal, not across goals: the
 * Conversions column is where goals are compared.
 */
export function GoalTrendBars({
  data,
  isLoading,
  label,
  className,
}: {
  data?: TrendPoint[];
  isLoading: boolean;
  /** Accessible name, e.g. "Signup, conversions per day". */
  label: string;
  className?: string;
}) {
  const t = useExtracted();
  const bucket = useStore(state => state.bucket);
  const timezone = useTimezone();
  const bars = useMemo(() => groupTrendBars(data ?? []), [data]);

  if (isLoading) {
    return <Skeleton className={cn("h-[26px] w-full rounded", className)} />;
  }

  // Nothing to draw: keep the cell's height so rows do not jump.
  if (bars.length === 0) {
    return <div className={cn("h-[26px] w-full", className)} />;
  }

  const max = Math.max(...bars.map(bar => bar.conversions));

  return (
    <div className={cn("flex h-[26px] w-full items-end gap-px", className)} role="img" aria-label={label}>
      {bars.map((bar, index) => (
        <Tooltip key={`${bar.startTime}-${index}`} delayDuration={100}>
          <TooltipTrigger asChild>
            <div
              className="min-w-px flex-1 rounded-t-[1px] bg-dataviz/70"
              style={{
                height: max > 0 ? `${Math.max(8, (bar.conversions / max) * 100)}%` : "8%",
                opacity: max > 0 ? 1 : 0.35,
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="w-44">
            <div className="space-y-1">
              <div className="font-medium text-neutral-700 dark:text-neutral-200">
                {formatBarTime(bar, bucket, timezone)}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-500 dark:text-neutral-400">{t("Conversions")}</span>
                <span className="font-semibold tabular-nums">{bar.conversions.toLocaleString()}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
