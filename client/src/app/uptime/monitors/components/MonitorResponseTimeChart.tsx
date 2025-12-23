"use client";

import { UptimeMonitor, useMonitorStats } from "@/api/uptime/monitors";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatChartDateTime, hour12, userLocale } from "@/lib/dateTimeUtils";
import { getTimezone } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { useNivoTheme } from "../../../../lib/nivo";
import { UptimeBucketSelection } from "./UptimeBucketSelection";
import { useUptimeStore } from "./uptimeStore";
import { getHoursFromTimeRange } from "./utils";

const MONITOR_COLORS = {
  dns: "hsl(160, 70%, 50%)",
  connection: "hsl(180, 70%, 45%)",
  tls: "hsl(200, 70%, 45%)",
  transfer: "hsl(220, 70%, 50%)",
} as const;

// HTTP timing metrics with labels for stacked view - gradient from green-turquoise to blue
const HTTP_METRICS = [
  { key: "dns_time_ms", label: "DNS", color: MONITOR_COLORS.dns }, // Green
  { key: "tcp_time_ms", label: "Connection", color: MONITOR_COLORS.connection }, // Turquoise
  { key: "tls_time_ms", label: "TLS Handshake", color: MONITOR_COLORS.tls }, // Light Blue
  { key: "transfer_time_ms", label: "Data Transfer", color: MONITOR_COLORS.transfer }, // Blue
] as const;

const formatTooltipValue = (value: number) => {
  return `${Math.round(value)}ms`;
};

export function MonitorResponseTimeChart({
  monitor,
  monitorId,
  isLoading: isLoadingMonitor,
}: {
  monitor?: UptimeMonitor;
  monitorId: number;
  isLoading: boolean;
}) {
  const monitorType = monitor?.monitorType;

  const { timeRange, bucket, setBucket, selectedRegion } = useUptimeStore();

  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (monitorType === "http") {
      setVisibleMetrics(new Set(HTTP_METRICS.map(m => m.key)));
    } else {
      setVisibleMetrics(new Set(["response_time_ms"]));
    }
  }, [monitorType]);

  const { data: statsData, isLoading } = useMonitorStats(monitorId, {
    hours: getHoursFromTimeRange(timeRange),
    bucket,
    region: selectedRegion,
  });

  const toggleMetric = (metricKey: string) => {
    setVisibleMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metricKey)) {
        newSet.delete(metricKey);
      } else {
        newSet.add(metricKey);
      }
      return newSet;
    });
  };

  const timezone = getTimezone();

  // Process data for the chart
  const processedData =
    statsData?.distribution
      ?.map((item: any) => {
        if (!item.hour) return null;

        // Parse timestamp as UTC and keep in UTC for chart (useUTC: true)
        const timestamp = DateTime.fromSQL(item.hour, { zone: "utc" });
        if (!timestamp.isValid) return null;

        const dataPoint: any = {
          time: timestamp.toFormat("yyyy-MM-dd HH:mm:ss"), // UTC format for chart
          timestamp: timestamp.toISO(), // Store ISO timestamp for proper timezone handling
          response_time_ms: item.avg_response_time,
          check_count: item.check_count || 0,
          success_count: item.success_count || 0,
          failure_count: item.failure_count || 0,
          timeout_count: item.timeout_count || 0,
        };

        // Calculate failure percentage
        dataPoint.failure_percentage =
          dataPoint.check_count > 0
            ? ((dataPoint.failure_count + dataPoint.timeout_count) / dataPoint.check_count) * 100
            : 0;

        // For HTTP monitors, include additional timing data
        if (monitorType === "http") {
          dataPoint.dns_time_ms = item.avg_dns_time || 0;
          dataPoint.tcp_time_ms = item.avg_tcp_time || 0;
          dataPoint.tls_time_ms = item.avg_tls_time || 0;
          dataPoint.ttfb_ms = item.avg_ttfb || 0;
          dataPoint.transfer_time_ms = item.avg_transfer_time || 0;
        }

        return dataPoint;
      })
      .filter((e: any) => e !== null)
      .reverse() ?? []; // Reverse to get chronological order (oldest first)

  // Create data series based on monitor type
  const createDataSeries = () => {
    if (monitorType === "tcp") {
      return [
        {
          id: "Response Time",
          color: "hsl(180, 70%, 45%)",
          data: processedData
            .map((item: any) => ({
              x: item.time,
              y: item.response_time_ms,
            }))
            .filter((point: any) => point.y !== null && point.y > 0),
        },
      ];
    }

    // For HTTP, show stacked timing metrics
    // Order matters for stacking - DNS first, then connection, TLS, and finally transfer
    return HTTP_METRICS.filter(metric => visibleMetrics.has(metric.key)).map(metric => ({
      id: metric.label,
      color: metric.color,
      data: processedData
        .map((item: any) => ({
          x: item.time,
          y: item[metric.key] || 0,
        }))
        .filter((point: any) => point.y !== null),
    }));
  };

  const data = createDataSeries();

  // Define gradients for stacked areas with lower opacity - gradient from green-turquoise to blue
  const defs =
    monitorType === "http"
      ? [
          {
            id: "gradientDNS",
            type: "linearGradient" as const,
            colors: [{ offset: 0, color: MONITOR_COLORS.dns, opacity: 0.1 }],
          },
          {
            id: "gradientConnection",
            type: "linearGradient" as const,
            colors: [{ offset: 0, color: MONITOR_COLORS.connection, opacity: 0.1 }],
          },
          {
            id: "gradientTLS",
            type: "linearGradient" as const,
            colors: [{ offset: 0, color: MONITOR_COLORS.tls, opacity: 0.1 }],
          },
          {
            id: "gradientTransfer",
            type: "linearGradient" as const,
            colors: [{ offset: 0, color: MONITOR_COLORS.transfer, opacity: 0.1 }],
          },
        ]
      : [];

  const fill =
    monitorType === "http"
      ? [
          { match: { id: "DNS" }, id: "gradientDNS" },
          { match: { id: "Connection" }, id: "gradientConnection" },
          { match: { id: "TLS Handshake" }, id: "gradientTLS" },
          { match: { id: "Data Transfer" }, id: "gradientTransfer" },
        ]
      : [];

  const formatXAxisValue = (value: Date) => {
    // Interpret JS Date as UTC, then convert to selected timezone
    const dt = DateTime.fromJSDate(value, { zone: "utc" }).setZone(timezone).setLocale(userLocale);

    // Format based on bucket size
    switch (bucket) {
      case "minute":
      case "five_minutes":
      case "ten_minutes":
      case "fifteen_minutes":
        return dt.toFormat(hour12 ? "h:mma" : "HH:mm");
      case "hour":
        if (timeRange === "24h") {
          return dt.toFormat(hour12 ? "ha" : "HH:mm");
        }
        return dt.toFormat(hour12 ? "MMM d, ha" : "dd MMM, HH:mm");
      case "day":
        return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
      case "week":
        return dt.toFormat("MMM d");
      case "month":
        return dt.toFormat("MMM yyyy");
      default:
        return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
    }
  };
  const nivoTheme = useNivoTheme();

  return (
    <Card className="overflow-visible">
      <CardContent className="p-4 overflow-visible">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium">Response Time</h3>

          <div className="flex items-center gap-4">
            {/* Metric toggles for HTTP monitors */}
            {monitorType === "http" && (
              <div className="flex items-center gap-2">
                {HTTP_METRICS.map(metric => {
                  const isVisible = visibleMetrics.has(metric.key);
                  return (
                    <button
                      key={metric.key}
                      onClick={() => toggleMetric(metric.key)}
                      className={cn(
                        "flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium transition-all",
                        isVisible
                          ? "bg-neutral-800 text-white"
                          : "bg-neutral-900 text-neutral-500 hover:text-neutral-400"
                      )}
                    >
                      <div
                        className={cn(
                          "w-3 h-3 rounded-sm transition-opacity",
                          isVisible ? "opacity-100" : "opacity-30"
                        )}
                        style={{ backgroundColor: metric.color }}
                      />
                      <span>{metric.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Time range and bucket selectors */}
            <div className="flex items-center gap-2">
              <UptimeBucketSelection timeRange={timeRange} bucket={bucket} onBucketChange={setBucket} />
            </div>
          </div>
        </div>

        {isLoadingMonitor || isLoading ? (
          <Skeleton className="w-full h-[400px] rounded-md" />
        ) : data.length === 0 || data.every(series => series.data.length === 0) ? (
          <div className="h-[400px] w-full flex items-center justify-center">
            <div className="text-center text-neutral-500">
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm">Try adjusting your time range</p>
            </div>
          </div>
        ) : (
          <div className="h-[400px] w-full relative" style={{ overflow: "visible", zIndex: 10 }}>
            <ResponsiveLine
              data={data}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 25, left: 50 }}
              defs={defs}
              fill={fill}
              xScale={{
                type: "time",
                precision: "second",
                format: "%Y-%m-%d %H:%M:%S",
                useUTC: true,
              }}
              yScale={{
                type: "linear",
                min: 0,
                stacked: monitorType === "http",
                reverse: false,
              }}
              enableGridX={false}
              enableGridY={true}
              gridYValues={5}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 0,
                tickPadding: 10,
                tickRotation: 0,
                truncateTickAt: 0,
                format: formatXAxisValue,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 10,
                tickRotation: 0,
                truncateTickAt: 0,
                tickValues: 5,
                format: value => `${value}ms`,
              }}
              colors={d => d.color}
              lineWidth={1}
              enablePoints={false}
              useMesh={true}
              animate={false}
              enableSlices="x"
              enableArea={monitorType === "http"}
              areaOpacity={0.7}
              layers={[
                "grid",
                "axes",
                "areas",
                // Custom layer for failure indicators - render AFTER areas and lines
                ({ innerHeight, xScale }) => (
                  <>
                    {processedData.map((point: any, index: number) => {
                      if (point.failure_percentage === 0) return null;

                      // Use the jsDate for proper timezone handling
                      const x = xScale(point.jsDate);

                      // Calculate width based on next point or use a default
                      let width = 20; // Default width
                      if (index < processedData.length - 1) {
                        const nextPoint = processedData[index + 1];
                        width = Math.abs(xScale(nextPoint.jsDate) - x);
                      } else if (index > 0) {
                        // For the last point, use the width from the previous interval
                        const prevPoint = processedData[index - 1];
                        width = Math.abs(x - xScale(prevPoint.jsDate));
                      }

                      // Determine color based on failure percentage
                      let color = "hsla(48, 95%, 53%, 0.4)"; // Yellow for < 50%
                      if (point.failure_percentage >= 50) {
                        color = `hsla(0, 84%, 60%, 0.4)`; // Red for >= 50%
                      }

                      return (
                        <rect
                          key={`failure-${index}`}
                          x={x}
                          y={0}
                          width={Math.max(1, Math.abs(width))}
                          height={innerHeight}
                          fill={color}
                        />
                      );
                    })}
                  </>
                ),
                "crosshair",
                "lines",
                "slices",
                "points",
                "mesh",
                "legends",
              ]}
              sliceTooltip={({ slice }: any) => {
                const currentTime = DateTime.fromJSDate(new Date(slice.points[0].data.x), { zone: "utc" }).setZone(timezone);

                // Find the corresponding data point to get failure info
                const dataPoint = processedData.find(
                  (p: any) => DateTime.fromISO(p.timestamp).toMillis() === currentTime.toUTC().toMillis()
                );

                // For stacked HTTP charts, show cumulative total
                const total =
                  monitorType === "http"
                    ? slice.points.reduce((sum: number, point: any) => sum + Number(point.data.yFormatted), 0)
                    : 0;

                return (
                  <ChartTooltip>
                    <div className="p-3 min-w-[200px]">
                      <div className="mb-2">{formatChartDateTime(currentTime, bucket)}</div>

                      {/* Show failure status if any failures */}
                      {dataPoint && dataPoint.failure_percentage > 0 && (
                        <div
                          className={cn(
                            "text-xs px-2 py-1 rounded mb-2",
                            dataPoint.failure_percentage >= 50
                              ? "bg-red-500/20 text-red-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          )}
                        >
                          {dataPoint.failure_count + dataPoint.timeout_count} of {dataPoint.check_count} checks failed (
                          {dataPoint.failure_percentage.toFixed(1)}%)
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs">
                        {slice.points.map((point: any) => (
                          <div key={point.seriesId} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: point.seriesColor }} />
                              <span>{point.seriesId}</span>
                            </div>
                            <span className="font-medium">{formatTooltipValue(Number(point.data.yFormatted))}</span>
                          </div>
                        ))}
                        {monitorType === "http" && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-neutral-100 dark:border-neutral-750">
                            <span>Total</span>
                            <span className="font-semibold">{formatTooltipValue(total)}</span>
                          </div>
                        )}
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
