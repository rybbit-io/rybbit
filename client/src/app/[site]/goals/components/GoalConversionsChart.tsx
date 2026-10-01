"use client";

import { DateTime } from "luxon";
import { useMemo } from "react";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { TimeSeriesChart, TimeSeriesChartPoint } from "@/components/charts/TimeSeriesChart";
import { bucketsBetween, getChartTimeBounds, shiftBuckets } from "@/components/charts/timeSeriesChartUtils";
import { formatChartDateTime } from "@/lib/dateTimeUtils";
import { useStore, useTimezone } from "@/lib/store";
import { TrendPoint } from "./GoalTrendBars";

/** The comparison line's colour, shared with the chart's legend. */
export const COMPARISON_COLOR = "hsl(var(--neutral-500))";

type CurrentPoint = TimeSeriesChartPoint & { currentTime: DateTime };
type PreviousPoint = TimeSeriesChartPoint & { originalTime: DateTime };

/**
 * One goal's conversions over the period, with the comparison period drawn
 * behind it. Built the way the main chart is (MainSection/Chart): the
 * comparison points are shifted onto this period's axis by a whole number of
 * buckets and keep their own date for the tooltip.
 */
export function GoalConversionsChart({ data, previousData }: { data: TrendPoint[]; previousData?: TrendPoint[] }) {
  const time = useStore(state => state.time);
  const previousTime = useStore(state => state.previousTime);
  const bucket = useStore(state => state.bucket);
  const timezone = useTimezone();

  const { current, previous, chartMin, chartMax, max, displayDashed } = useMemo(() => {
    const { min: boundsMin, max: boundsMax } = getChartTimeBounds(time, bucket, timezone);
    const now = DateTime.now();
    const lowerBoundMs = boundsMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();

    // Points outside the selected period are a previous range still on screen
    // while the new one loads; drawing them would stretch the axis.
    const currentPoints: CurrentPoint[] = [];
    for (const point of data) {
      const timestamp = DateTime.fromSQL(point.time, { zone: timezone }).toUTC();
      const ms = timestamp.toMillis();
      if (timestamp > now || ms > upperBoundMs) continue;
      if (lowerBoundMs !== undefined && ms < lowerBoundMs) continue;
      currentPoints.push({ x: timestamp.toJSDate(), y: point.conversions, currentTime: timestamp });
    }

    const previousMin = previousTime ? getChartTimeBounds(previousTime, bucket, timezone).min : undefined;
    const bucketShift =
      boundsMin && previousMin
        ? bucketsBetween(
            DateTime.fromJSDate(previousMin, { zone: timezone }),
            DateTime.fromJSDate(boundsMin, { zone: timezone }),
            bucket
          )
        : 0;
    const previousPoints: PreviousPoint[] = [];
    for (const point of previousTime ? (previousData ?? []) : []) {
      const originalTime = DateTime.fromSQL(point.time, { zone: timezone }).toUTC();
      const ms = shiftBuckets(originalTime.setZone(timezone), bucket, bucketShift).toMillis();
      if (ms > upperBoundMs) continue;
      if (lowerBoundMs !== undefined && ms < lowerBoundMs) continue;
      previousPoints.push({ x: new Date(ms), y: point.conversions, originalTime });
    }

    // The last bucket is dashed while it is still filling. The same rule as
    // the main chart, so the two charts agree on what "still filling" means.
    const today = now.toISODate();
    const isExactRange = time.mode === "range" && Boolean(time.startTime && time.endTime);
    const isMinuteBucket = bucket === "minute" || bucket === "five_minutes";
    const isSettled =
      time.mode === "all-time" ||
      time.mode === "year" ||
      isExactRange ||
      (time.mode === "month" && time.month !== now.toFormat("yyyy-MM-01")) ||
      (time.mode === "day" && time.day !== today) ||
      (time.mode === "range" && time.endDate !== today) ||
      ((time.mode === "day" || time.mode === "past-minutes") && isMinuteBucket);

    return {
      current: currentPoints,
      previous: previousPoints,
      chartMin: boundsMin ?? currentPoints[0]?.x,
      chartMax: boundsMax ?? currentPoints[currentPoints.length - 1]?.x ?? now.toJSDate(),
      max: Math.max(1, ...currentPoints.map(point => point.y), ...previousPoints.map(point => point.y)),
      displayDashed: !isSettled && currentPoints.length >= 2,
    };
  }, [data, previousData, time, previousTime, bucket, timezone]);

  return (
    <TimeSeriesChart
      current={current}
      previous={previous}
      max={max}
      chartMin={chartMin}
      chartMax={chartMax}
      displayDashed={displayDashed}
      previousColor={COMPARISON_COLOR}
      renderTooltip={({ point, previousPoint, bucket: tooltipBucket }) => (
        <ChartTooltip>
          <div className="m-2 flex flex-col gap-1">
            <div className="flex justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-3 w-1 shrink-0 rounded-[3px] bg-dataviz" />
                <span className="truncate">{formatChartDateTime(point.currentTime, tooltipBucket)}</span>
              </div>
              <div className="shrink-0 tabular-nums">{point.y.toLocaleString()}</div>
            </div>
            {previousPoint && (
              <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-3 w-1 shrink-0 rounded-[3px]" style={{ backgroundColor: COMPARISON_COLOR }} />
                  <span className="truncate">{formatChartDateTime(previousPoint.originalTime, tooltipBucket)}</span>
                </div>
                <div className="shrink-0 tabular-nums">{previousPoint.y.toLocaleString()}</div>
              </div>
            )}
          </div>
        </ChartTooltip>
      )}
    />
  );
}
