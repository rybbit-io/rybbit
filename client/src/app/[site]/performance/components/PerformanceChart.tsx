"use client";

import { Card, CardContent, CardLoader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateTime } from "luxon";
import Link from "next/link";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";

import { useGetPerformanceTimeSeries } from "../../../../api/analytics/hooks/performance/useGetPerformanceTimeSeries";
import { BucketSelection } from "../../../../components/BucketSelection";
import { ChartTooltip } from "../../../../components/charts/ChartTooltip";
import { TimeSeriesChart } from "../../../../components/charts/TimeSeriesChart";
import type { TimeSeriesChartPoint, TimeSeriesChartSeries } from "../../../../components/charts/TimeSeriesChart";
import { getChartTimeBounds } from "../../../../components/charts/timeSeriesChartUtils";
import { RybbitTextLogo } from "../../../../components/RybbitLogo";
import { ToggleChip } from "../../../../components/ToggleChip";
import { useWhiteLabel } from "../../../../hooks/useIsWhiteLabel";
import { authClient } from "../../../../lib/auth";
import { formatChartDateTime } from "../../../../lib/dateTimeUtils";
import { getTimezone, useStore } from "../../../../lib/store";
import { usePerformanceStore } from "../performanceStore";
import { formatMetricValue, getMetricUnit, getPerformanceThresholds, METRIC_LABELS } from "../utils/performanceUtils";

const PERCENTILES = ["P50", "P75", "P90", "P99"] as const;
type PercentileLabel = (typeof PERCENTILES)[number];

const percentileColors: Record<PercentileLabel, string> = {
  P50: "hsl(var(--indigo-100))",
  P75: "hsl(var(--indigo-300))",
  P90: "hsl(var(--indigo-400))",
  P99: "hsl(var(--indigo-500))",
};

const percentileFields: Record<PercentileLabel, "p50" | "p75" | "p90" | "p99"> = {
  P50: "p50",
  P75: "p75",
  P90: "p90",
  P99: "p99",
};

type PerformancePoint = TimeSeriesChartPoint & {
  currentTime: DateTime;
  percentile: PercentileLabel;
};

export function PerformanceChart() {
  const t = useExtracted();
  const session = authClient.useSession();
  const { site, bucket, time } = useStore();
  const { selectedPerformanceMetric } = usePerformanceStore();
  const { isWhiteLabel } = useWhiteLabel();
  const timezone = getTimezone();

  const [visiblePercentiles, setVisiblePercentiles] = useState<Set<string>>(new Set(PERCENTILES));

  const togglePercentile = (percentile: string) => {
    setVisiblePercentiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(percentile)) {
        newSet.delete(percentile);
      } else {
        newSet.add(percentile);
      }
      return newSet;
    });
  };

  const {
    data: timeSeriesData,
    isLoading,
    isFetching,
  } = useGetPerformanceTimeSeries({
    site,
  });

  const thresholds = getPerformanceThresholds(selectedPerformanceMetric);

  const thresholdMarkers = thresholds
    ? [
        {
          value: thresholds.good,
          color: "hsl(var(--green-400))",
          strokeDasharray: "8 8",
          label: `Good (≤${formatMetricValue(selectedPerformanceMetric, thresholds.good)}${getMetricUnit(
            selectedPerformanceMetric,
            thresholds.good
          )})`,
        },
        {
          value: thresholds.needs_improvement,
          color: "hsl(var(--amber-400))",
          strokeDasharray: "8 8",
          label: `Needs Improvement (≤${formatMetricValue(
            selectedPerformanceMetric,
            thresholds.needs_improvement
          )}${getMetricUnit(selectedPerformanceMetric, thresholds.needs_improvement)})`,
        },
      ]
    : [];

  const { current, chartSeries, chartMin, chartMax, max } = useMemo(() => {
    const { min: boundsMin, max: boundsMax } = getChartTimeBounds(time, bucket, timezone);

    const now = DateTime.now();
    const lowerBoundMs = boundsMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();
    const seriesByPercentile = new Map<PercentileLabel, PerformancePoint[]>(
      PERCENTILES.map(percentile => [percentile, []])
    );

    timeSeriesData?.data?.forEach(item => {
      const timestamp = DateTime.fromSQL(item.time, { zone: timezone }).toUTC();
      if (timestamp > now) return;
      const timestampMs = timestamp.toMillis();
      if (lowerBoundMs !== undefined && timestampMs < lowerBoundMs) return;
      if (timestampMs > upperBoundMs) return;

      PERCENTILES.forEach(percentile => {
        if (!visiblePercentiles.has(percentile)) return;
        const field = `${selectedPerformanceMetric}_${percentileFields[percentile]}` as keyof typeof item;
        const value = item[field];
        if (typeof value !== "number") return;
        seriesByPercentile.get(percentile)?.push({
          x: timestamp.toJSDate(),
          y: value,
          currentTime: timestamp,
          percentile,
        });
      });
    });

    const chartSeries: TimeSeriesChartSeries<PerformancePoint>[] = PERCENTILES.map(percentile => ({
      id: percentile,
      color: percentileColors[percentile],
      data: seriesByPercentile.get(percentile) ?? [],
      strokeWidth: 1,
    })).filter(series => series.data.length > 0 && visiblePercentiles.has(series.id));

    const allPoints = chartSeries.flatMap(series => series.data);
    const dataMin = allPoints.length ? new Date(Math.min(...allPoints.map(point => point.x.getTime()))) : undefined;
    const dataMax = allPoints.length ? new Date(Math.max(...allPoints.map(point => point.x.getTime()))) : undefined;
    const max = allPoints.reduce((largest, point) => Math.max(largest, point.y), 0);

    return {
      current: chartSeries[0]?.data ?? [],
      chartSeries,
      chartMin: dataMin ?? boundsMin,
      chartMax: dataMax ?? boundsMax ?? now.toJSDate(),
      max,
    };
  }, [bucket, selectedPerformanceMetric, time, timeSeriesData, timezone, visiblePercentiles]);

  return (
    <Card className="overflow-visible">
      {isFetching && <CardLoader />}
      <CardContent className="p-2 md:p-4 py-3 w-full">
        <div className="flex items-center justify-between px-2 md:px-0">
          <div className="flex items-center space-x-4">
            {!isWhiteLabel && (
              <Link href={session.data ? "/" : "https://rybbit.com"} className="opacity-75">
                <RybbitTextLogo width={80} />
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-200">
              {METRIC_LABELS[selectedPerformanceMetric]}
            </span>
            <div className="flex items-center space-x-2">
              {PERCENTILES.map(percentile => (
                <ToggleChip
                  key={percentile}
                  isSelected={visiblePercentiles.has(percentile)}
                  onClick={() => togglePercentile(percentile)}
                  swatchColor={percentileColors[percentile]}
                  label={percentile}
                />
              ))}
            </div>
          </div>
          <BucketSelection />
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="w-full h-[300px] rounded-md" />
          </div>
        ) : chartSeries.length === 0 ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <p className="text-lg font-medium">{t("No performance data available")}</p>
              <p className="text-sm">{t("Try adjusting your date range or filters")}</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <TimeSeriesChart
              current={current}
              series={chartSeries}
              markers={thresholdMarkers}
              max={max}
              chartMin={chartMin}
              chartMax={chartMax}
              currentColor={chartSeries[0]?.color}
              yTickFormat={value => formatMetricValue(selectedPerformanceMetric, value)}
              renderTooltip={({ point, points, bucket }) => (
                <ChartTooltip>
                  <div className="p-3 min-w-[150px]">
                    <div className="mb-2">{formatChartDateTime(point.currentTime, bucket)}</div>
                    <div className="space-y-2">
                      {points.map(({ id, color, point }) => (
                        <div key={id} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: color }} />
                            <span>{id}</span>
                          </div>
                          <span>
                            <span className="font-medium">{formatMetricValue(selectedPerformanceMetric, point.y)}</span>
                            <span className="text-muted-foreground">
                              {getMetricUnit(selectedPerformanceMetric, point.y)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartTooltip>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
