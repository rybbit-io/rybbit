"use client";

import { DateTime } from "luxon";
import { useMemo } from "react";

import type { GetOverviewBucketedResponse } from "../../../../../api/analytics/endpoints";
import type { APIResponse } from "../../../../../api/types";
import { ChartTooltip } from "../../../../../components/charts/ChartTooltip";
import { TimeSeriesChart } from "../../../../../components/charts/TimeSeriesChart";
import type { TimeSeriesChartPoint } from "../../../../../components/charts/TimeSeriesChart";
import { getChartTimeBounds } from "../../../../../components/charts/timeSeriesChartUtils";
import { formatChartDateTime } from "../../../../../lib/dateTimeUtils";
import { getTimezone, useStore } from "../../../../../lib/store";
import type { StatType } from "../../../../../lib/store";
import { formatSecondsAsMinutesAndSeconds } from "../../../../../lib/utils";

type Point = TimeSeriesChartPoint & {
  currentTime: DateTime;
};

type PrevPoint = TimeSeriesChartPoint & {
  originalTime: DateTime;
};

const formatTooltipValue = (value: number, selectedStat: StatType): string => {
  if (selectedStat === "bounce_rate") return `${value.toFixed(1)}%`;
  if (selectedStat === "session_duration") return formatSecondsAsMinutesAndSeconds(value);
  return value.toLocaleString();
};

export function Chart({
  data,
  previousData,
  max,
  chartXMax,
}: {
  data: APIResponse<GetOverviewBucketedResponse> | undefined;
  previousData: APIResponse<GetOverviewBucketedResponse> | undefined;
  max: number;
  chartXMax: Date | undefined;
}) {
  const { time, bucket, selectedStat, previousTime } = useStore();
  const timezone = getTimezone();
  const isExactRange = time.mode === "range" && Boolean(time.startTime && time.endTime);

  const { current, previous, chartMin, chartMax, displayDashed } = useMemo(() => {
    const { min: cMin, max: boundsMax } = getChartTimeBounds(time, bucket, timezone);

    const now = DateTime.now();
    const lowerBoundMs = cMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();

    // Filter against strict period bounds so stale transition data does not
    // bleed onto the new x-axis during goBack/goForward.
    const currentPoints: Point[] = [];
    data?.data?.forEach(e => {
      const ts = DateTime.fromSQL(e.time, { zone: timezone }).toUTC();
      if (ts > now) return;
      const tsMs = ts.toMillis();
      if (lowerBoundMs !== undefined && tsMs < lowerBoundMs) return;
      if (tsMs > upperBoundMs) return;
      currentPoints.push({
        x: ts.toJSDate(),
        y: Number(e[selectedStat] ?? 0),
        currentTime: ts,
      });
    });

    // For all-time and other unbounded modes, derive the left edge from data
    // so the x-axis is not a dummy [0,1] domain.
    const dataMin = currentPoints.length ? currentPoints[0].x : undefined;
    const dataMax = currentPoints.length ? currentPoints[currentPoints.length - 1].x : undefined;
    const chartXMaxMs = chartXMax?.getTime();
    const boundedChartXMax =
      chartXMax &&
      chartXMaxMs !== undefined &&
      (lowerBoundMs === undefined || chartXMaxMs >= lowerBoundMs) &&
      chartXMaxMs <= upperBoundMs
        ? chartXMax
        : undefined;
    const effChartMin = cMin ?? dataMin;
    const effChartMax = boundedChartXMax ?? boundsMax ?? dataMax ?? now.toJSDate();

    // Previous points are time-shifted onto the current period's x-axis, but
    // keep originalTime so the tooltip can show the real previous date.
    const { min: prevMin } = getChartTimeBounds(previousTime, bucket, timezone);
    const offsetMs = cMin && prevMin ? cMin.getTime() - prevMin.getTime() : 0;
    const previousPoints: PrevPoint[] = [];
    previousData?.data?.forEach(e => {
      const prevTs = DateTime.fromSQL(e.time, { zone: timezone }).toUTC();
      const mappedMs = prevTs.toMillis() + offsetMs;
      if (lowerBoundMs !== undefined && mappedMs < lowerBoundMs) return;
      if (mappedMs > upperBoundMs) return;
      previousPoints.push({
        x: new Date(mappedMs),
        y: Number(e[selectedStat] ?? 0),
        originalTime: prevTs,
      });
    });

    const currentDayStr = DateTime.now().toISODate();
    const currentMonthStr = DateTime.now().toFormat("yyyy-MM-01");
    const shouldNotDisplay =
      time.mode === "all-time" ||
      isExactRange ||
      time.mode === "year" ||
      (time.mode === "month" && time.month !== currentMonthStr) ||
      (time.mode === "day" && time.day !== currentDayStr) ||
      (time.mode === "range" && time.endDate !== currentDayStr) ||
      (time.mode === "day" && (bucket === "minute" || bucket === "five_minutes")) ||
      (time.mode === "past-minutes" && (bucket === "minute" || bucket === "five_minutes"));
    const dashed = currentPoints.length >= 2 && !shouldNotDisplay;

    return {
      current: currentPoints,
      previous: previousPoints,
      chartMin: effChartMin,
      chartMax: effChartMax,
      displayDashed: dashed,
    };
  }, [data, previousData, selectedStat, time, previousTime, bucket, timezone, chartXMax, isExactRange]);

  return (
    <TimeSeriesChart
      current={current}
      previous={previous}
      max={max}
      chartMin={chartMin}
      chartMax={chartMax}
      displayDashed={displayDashed}
      renderTooltip={({ point, previousPoint, bucket }) => {
        const hoverCurrentY = point.y;
        const hoverPreviousY = previousPoint?.y ?? 0;
        const hoverDiff = hoverCurrentY - hoverPreviousY;
        const hoverDiffPct = previousPoint && hoverPreviousY ? (hoverDiff / hoverPreviousY) * 100 : null;

        return (
          <ChartTooltip>
            {hoverDiffPct !== null && (
              <div
                className="text-base font-medium px-2 pt-1.5 pb-1"
                style={{
                  color: hoverDiffPct > 0 ? "hsl(var(--green-400))" : "hsl(var(--red-400))",
                }}
              >
                {hoverDiffPct > 0 ? "+" : ""}
                {hoverDiffPct.toFixed(2)}%
              </div>
            )}
            <div className="w-full h-px bg-neutral-100 dark:bg-neutral-750" />
            <div className="m-2 flex flex-col gap-1">
              <div className="flex justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-3 rounded-[3px] bg-dataviz shrink-0" />
                  <span className="truncate">{formatChartDateTime(point.currentTime, bucket)}</span>
                </div>
                <div className="shrink-0">{formatTooltipValue(hoverCurrentY, selectedStat)}</div>
              </div>
              {previousPoint && (
                <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1 h-3 rounded-[3px] bg-neutral-200 dark:bg-neutral-750 shrink-0" />
                    <span className="truncate">{formatChartDateTime(previousPoint.originalTime, bucket)}</span>
                  </div>
                  <div className="shrink-0">{formatTooltipValue(hoverPreviousY, selectedStat)}</div>
                </div>
              )}
            </div>
          </ChartTooltip>
        );
      }}
    />
  );
}
