"use client";

import { Card, CardContent, CardLoader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNivoTheme } from "@/lib/nivo";
import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";
import { Tilt_Warp } from "next/font/google";
import Link from "next/link";
import { useState } from "react";
import { useGetPerformanceTimeSeries } from "../../../../api/analytics/performance/useGetPerformanceTimeSeries";
import { BucketSelection } from "../../../../components/BucketSelection";
import { RybbitLogo } from "../../../../components/RybbitLogo";
import { authClient } from "../../../../lib/auth";
import { formatChartDateTime, hour12, userLocale } from "../../../../lib/dateTimeUtils";
import { useStore } from "../../../../lib/store";
import { cn } from "../../../../lib/utils";
import { usePerformanceStore } from "../performanceStore";
import { formatMetricValue, getMetricUnit, getPerformanceThresholds, METRIC_LABELS } from "../utils/performanceUtils";
import { ChartTooltip } from "../../../../components/charts/ChartTooltip";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export function PerformanceChart() {
  const session = authClient.useSession();
  const { site, bucket } = useStore();
  const { selectedPerformanceMetric, selectedPercentile } = usePerformanceStore();
  const nivoTheme = useNivoTheme();

  // State for toggling percentile visibility
  const [visiblePercentiles, setVisiblePercentiles] = useState<Set<string>>(new Set(["P50", "P75", "P90", "P99"]));

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

  // Transform data to show all percentiles as separate lines
  const processedData =
    timeSeriesData?.data
      ?.map((item: any) => {
        // Parse timestamp properly using luxon (same as Chart.tsx)
        const timestamp = DateTime.fromSQL(item.time).toUTC();

        // Filter out dates from the future
        if (timestamp > DateTime.now()) {
          return null;
        }

        return {
          time: timestamp.toFormat("yyyy-MM-dd HH:mm:ss"),
          p50: item[`${selectedPerformanceMetric}_p50`] ?? null,
          p75: item[`${selectedPerformanceMetric}_p75`] ?? null,
          p90: item[`${selectedPerformanceMetric}_p90`] ?? null,
          p99: item[`${selectedPerformanceMetric}_p99`] ?? null,
        };
      })
      .filter(e => e !== null) ?? [];

  // Create separate data series for each percentile - using shades of blue
  const percentileColors = {
    p50: "hsl(var(--indigo-100))", // light blue
    p75: "hsl(var(--indigo-300))", // medium blue
    p90: "hsl(var(--indigo-400))", // blue
    p99: "hsl(var(--indigo-500))", // dark blue
  };

  const data = [
    {
      id: "P50",
      color: percentileColors.p50,
      data: processedData
        .map(item => ({
          x: item.time,
          y: item.p50,
        }))
        .filter(point => point.y !== null),
    },
    {
      id: "P75",
      color: percentileColors.p75,
      data: processedData
        .map(item => ({
          x: item.time,
          y: item.p75,
        }))
        .filter(point => point.y !== null),
    },
    {
      id: "P90",
      color: percentileColors.p90,
      data: processedData
        .map(item => ({
          x: item.time,
          y: item.p90,
        }))
        .filter(point => point.y !== null),
    },
    {
      id: "P99",
      color: percentileColors.p99,
      data: processedData
        .map(item => ({
          x: item.time,
          y: item.p99,
        }))
        .filter(point => point.y !== null),
    },
  ].filter(series => series.data.length > 0 && visiblePercentiles.has(series.id));

  const formatXAxisValue = (value: any) => {
    const dt = DateTime.fromJSDate(value).setLocale(userLocale);
    if (
      bucket === "hour" ||
      bucket === "minute" ||
      bucket === "five_minutes" ||
      bucket === "ten_minutes" ||
      bucket === "fifteen_minutes"
    ) {
      return dt.toFormat(hour12 ? "ha" : "HH:mm");
    }
    return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
  };

  // Get performance thresholds for the current metric
  const thresholds = getPerformanceThresholds(selectedPerformanceMetric);

  // Create markers for performance thresholds
  const markers = thresholds
    ? [
        {
          axis: "y" as const,
          value: thresholds.good,
          lineStyle: {
            stroke: "hsl(var(--green-400))", // green
            strokeWidth: 1,
            strokeDasharray: "8 8",
          },
          legend: `Good (≤${formatMetricValue(selectedPerformanceMetric, thresholds.good)}${getMetricUnit(
            selectedPerformanceMetric,
            thresholds.good
          )})`,
          legendPosition: "top-left" as const,
          legendOrientation: "horizontal" as const,
          textStyle: {
            fill: "hsl(var(--green-400))",
            fontSize: 11,
          },
        },
        {
          axis: "y" as const,
          value: thresholds.needs_improvement,
          lineStyle: {
            stroke: "hsl(var(--amber-400))", // yellow/amber
            strokeWidth: 1,
            strokeDasharray: "8 8",
          },
          legend: `Needs Improvement (≤${formatMetricValue(
            selectedPerformanceMetric,
            thresholds.needs_improvement
          )}${getMetricUnit(selectedPerformanceMetric, thresholds.needs_improvement)})`,
          legendPosition: "top-left" as const,
          legendOrientation: "horizontal" as const,
          textStyle: {
            fill: "hsl(var(--amber-400))",
            fontSize: 11,
          },
        },
      ]
    : [];

  return (
    <Card>
      {isFetching && <CardLoader />}
      <CardContent className="p-2 md:p-4 py-3 w-full">
        <div className="flex items-center justify-between px-2 md:px-0">
          <div className="flex items-center space-x-4">
            <Link
              href={session.data ? "/" : "https://rybbit.com"}
              className={cn("text-lg font-semibold flex items-center gap-1.5 opacity-75", tilt_wrap.className)}
            >
              <RybbitLogo width={20} height={20} />
              rybbit.com
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-200">
              {METRIC_LABELS[selectedPerformanceMetric]}
            </span>
            <div className="flex items-center space-x-2">
              {(["P50", "P75", "P90", "P99"] as const).map(percentile => {
                const colors = {
                  P50: "hsl(var(--indigo-100))", // light blue
                  P75: "hsl(var(--indigo-300))", // medium blue
                  P90: "hsl(var(--indigo-400))", // blue
                  P99: "hsl(var(--indigo-500))", // dark blue
                };
                const isVisible = visiblePercentiles.has(percentile);

                return (
                  <button
                    key={percentile}
                    onClick={() => togglePercentile(percentile)}
                    className={cn(
                      "flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium transition-all",
                      isVisible
                        ? "bg-neutral-150 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        : "bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400"
                    )}
                  >
                    <div
                      className={cn("w-3 h-3 rounded-sm transition-opacity", isVisible ? "opacity-100" : "opacity-30")}
                      style={{ backgroundColor: colors[percentile] }}
                    />
                    <span>{percentile}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <BucketSelection />
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="w-full h-[300px] rounded-md" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <p className="text-lg font-medium">No performance data available</p>
              <p className="text-sm">Try adjusting your date range or filters</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveLine
              data={data}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
              xScale={{
                type: "time",
                format: "%Y-%m-%d %H:%M:%S",
                precision: "second",
                useUTC: true,
              }}
              yScale={{
                type: "linear",
                min: 0,
                stacked: false,
                reverse: false,
              }}
              enableGridX={true}
              enableGridY={true}
              gridYValues={5}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 10,
                tickRotation: 0,
                truncateTickAt: 0,
                format: formatXAxisValue,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 10,
                tickRotation: 0,
                truncateTickAt: 0,
                tickValues: 5,
                format: value => formatMetricValue(selectedPerformanceMetric, value),
              }}
              colors={d => d.color}
              enableTouchCrosshair={true}
              enablePoints={false}
              useMesh={true}
              animate={false}
              enableSlices="x"
              enableArea={false}
              markers={markers}
              lineWidth={1}
              sliceTooltip={({ slice }: any) => {
                const currentTime = DateTime.fromJSDate(new Date(slice.points[0].data.x));

                return (
                  <ChartTooltip>
                    <div className="p-3 min-w-[150px]">
                      <div className="mb-2">{formatChartDateTime(currentTime, bucket)}</div>
                      <div className="space-y-2">
                        {slice.points.map((point: any) => {
                          return (
                            <div key={point.seriesId} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: point.seriesColor }} />
                                <span>{point.seriesId}</span>
                              </div>
                              <span>
                                <span className="font-medium">
                                  {formatMetricValue(selectedPerformanceMetric, Number(point.data.yFormatted))}
                                </span>
                                <span className="text-muted-foreground">
                                  {getMetricUnit(selectedPerformanceMetric, Number(point.data.yFormatted))}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </ChartTooltip>
                );
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
