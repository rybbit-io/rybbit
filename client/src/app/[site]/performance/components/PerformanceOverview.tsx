"use client";

import { Gauge, Image as ImageIcon, LucideIcon, Move, Paintbrush, Pointer, Server } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { Delta } from "@/components/site/Delta";
import { Skeleton } from "@/components/ui/skeleton";
import { DeltaValue, percentDelta } from "@/lib/delta";
import { cn } from "@/lib/utils";
import { useGetPerformanceOverview } from "../../../../api/analytics/hooks/performance/useGetPerformanceOverview";
import { useGetOverview } from "../../../../api/analytics/hooks/useGetOverview";
import { useComparisonEnabled, useStore } from "../../../../lib/store";
import { PerformanceMetric, usePerformanceStore } from "../performanceStore";
import {
  formatMetric,
  formatShare,
  getMetricRating,
  getRatingSplit,
  METRIC_LABELS_SHORT,
  PERFORMANCE_METRICS,
  RATING_TEXT_CLASS,
} from "../utils/performanceUtils";
import { MetricTooltip } from "./shared/MetricTooltip";
import { RatingMark, useRatingLabels } from "./shared/RatingMark";

const METRIC_ICONS: Record<PerformanceMetric, LucideIcon> = {
  lcp: ImageIcon,
  inp: Pointer,
  cls: Move,
  fcp: Paintbrush,
  ttfb: Server,
};

// The band clips its corners, which would cut the selection ring of a cell
// sitting in one. Each metric cell rounds the corners it occupies at each
// width: two columns, three from `sm`, one row of six from `lg`.
const CORNERS = [
  "rounded-tl-lg lg:rounded-l-lg",
  "rounded-tr-lg sm:rounded-none",
  "sm:rounded-tr-lg lg:rounded-none",
  "sm:rounded-bl-lg lg:rounded-none",
  "rounded-bl-lg sm:rounded-none",
];

const CELL = "min-w-0 bg-white px-3.5 py-2.5 text-left dark:bg-neutral-900";
const LABEL =
  "flex min-w-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400";

// The same three lines as the shared StatBand cell, so the band keeps its height while loading.
function CellBody({
  isLoading,
  value,
  delta,
  upIsGood,
  sub,
}: {
  isLoading: boolean;
  value: ReactNode;
  delta: DeltaValue | null;
  upIsGood: boolean;
  sub: ReactNode;
}) {
  if (isLoading) {
    return (
      <>
        <div className="mt-0.5 flex h-6 items-center">
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <div className="mt-0.5 flex h-4 items-center">
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="truncate text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
          {value}
        </span>
        <Delta value={delta} upIsGood={upIsGood} />
      </div>
      <div className="mt-0.5 h-4 truncate text-xs tabular-nums text-neutral-500 dark:text-neutral-400">{sub}</div>
    </>
  );
}

/**
 * The page's stat band: the five Web Vitals at the chosen percentile, each
 * rated and compared with the previous period, then how many page loads they
 * rest on. A metric cell selects what the chart and the table's share and
 * change columns show.
 *
 * Drawn here rather than with the shared StatBand, whose cells cannot be
 * selected and have no place for a rating; the markup follows it.
 */
export function PerformanceOverview() {
  const t = useExtracted();
  const site = useStore(state => state.site);
  const comparisonEnabled = useComparisonEnabled();
  const ratingLabels = useRatingLabels();
  const { selectedPercentile, selectedPerformanceMetric, setSelectedPerformanceMetric } = usePerformanceStore();

  const { data: current, isLoading } = useGetPerformanceOverview({ site });
  const { data: previousData } = useGetPerformanceOverview({ site, periodTime: "previous" });
  const { data: siteOverview } = useGetOverview({ site });
  // A query that is switched off keeps its last result as a placeholder.
  const previous = comparisonEnabled ? previousData : undefined;

  const loads = current?.total_performance_events ?? 0;
  const pageviews = siteOverview?.pageviews ?? 0;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-100 dark:border-neutral-850">
      <div className="grid grid-cols-2 gap-px bg-neutral-100 dark:bg-neutral-850 sm:grid-cols-3 lg:grid-cols-6">
        {PERFORMANCE_METRICS.map((metric, index) => {
          const Icon = METRIC_ICONS[metric];
          const value = current?.[`${metric}_${selectedPercentile}`] ?? null;
          const rating = value === null ? null : getMetricRating(metric, value);
          const split = getRatingSplit(current, metric);
          const selected = selectedPerformanceMetric === metric;

          return (
            <button
              key={metric}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedPerformanceMetric(metric)}
              className={cn(
                CELL,
                CORNERS[index],
                "relative transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-400 dark:hover:bg-neutral-850 dark:focus-visible:ring-neutral-500",
                selected &&
                  "z-10 ring-2 ring-inset ring-neutral-900 hover:bg-white dark:ring-neutral-50 dark:hover:bg-neutral-900"
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className={cn(LABEL, "shrink-0")}>
                  <Icon className="h-3 w-3 shrink-0" />
                  <MetricTooltip metric={metric}>
                    <span className="truncate">{METRIC_LABELS_SHORT[metric]}</span>
                  </MetricTooltip>
                </div>
                {rating && !isLoading && (
                  <span
                    className={cn(
                      "inline-flex min-w-0 items-center gap-1 text-[11px] font-medium",
                      RATING_TEXT_CLASS[rating]
                    )}
                    title={ratingLabels[rating]}
                  >
                    <RatingMark rating={rating} className="h-1.5 w-1.5" />
                    <span className="truncate">{ratingLabels[rating]}</span>
                  </span>
                )}
              </div>
              <CellBody
                isLoading={isLoading}
                value={value === null ? "—" : formatMetric(metric, value)}
                delta={percentDelta(value, previous?.[`${metric}_${selectedPercentile}`])}
                upIsGood={false}
                sub={split ? t("{share} of loads good", { share: formatShare(split.goodShare) }) : ""}
              />
            </button>
          );
        })}
        <div className={CELL}>
          <div className={LABEL}>
            <Gauge className="h-3 w-3 shrink-0" />
            <span className="truncate">{t("Loads measured")}</span>
          </div>
          <CellBody
            isLoading={isLoading}
            value={loads.toLocaleString()}
            delta={loads > 0 ? percentDelta(loads, previous?.total_performance_events) : null}
            upIsGood
            sub={
              loads > 0 && pageviews > 0
                ? t("{share} of pageviews", { share: formatShare((loads / pageviews) * 100) })
                : ""
            }
          />
        </div>
      </div>
    </div>
  );
}
