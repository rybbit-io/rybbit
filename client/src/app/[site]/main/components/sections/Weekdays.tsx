import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { useGetOverviewBucketed } from "../../../../../api/analytics/useGetOverviewBucketed";
import { Tabs, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Card, CardContent, CardLoader } from "../../../../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { StatType, useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";

import { formatLocalTime, hourLabels, longDayNames, shortDayNames } from "../../../../../lib/dateTimeUtils";

export function Weekdays() {
  const { site, time } = useStore();
  const [metric, setMetric] = useState<StatType>("users");

  const { data, isFetching, error } = useGetOverviewBucketed({
    site,
    bucket: "hour",
  });

  // Generate aggregated data for the heatmap
  const heatmapData = useMemo(() => {
    if (!data?.data) return [];

    // Initialize a 2D array for days (0-6) and hours (0-23)
    const aggregated: number[][] = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));

    // Initialize a counter for each day-hour combination
    const counts: number[][] = Array(7)
      .fill(0)
      .map(() => Array(24).fill(0));

    // Process each data point
    data.data.forEach(item => {
      if (!item || !item.time) return;

      // Parse the timestamp
      const date = DateTime.fromSQL(item.time);
      if (!date.isValid) return;

      const dayOfWeek = (date.weekday - 1) % 7; // Luxon uses 1 for Monday, 7 for Sunday
      const hourOfDay = date.hour;

      // Safely check if the metric exists and is a number
      const metricValue = typeof item[metric] === "number" ? item[metric] : 0;

      // Add the value for the selected metric
      aggregated[dayOfWeek][hourOfDay] += metricValue;
      counts[dayOfWeek][hourOfDay]++;
    });

    // Calculate averages for each day-hour combination
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (counts[day][hour] > 0) {
          aggregated[day][hour] = aggregated[day][hour] / counts[day][hour];
        }
      }
    }

    return aggregated;
  }, [data, metric]);

  // Find max value for color intensity scaling
  const maxValue = useMemo(() => {
    if (!heatmapData || !heatmapData.length) return 0;

    let max = 0;
    for (const row of heatmapData) {
      for (const value of row) {
        if (typeof value === "number" && !isNaN(value) && value > max) {
          max = value;
        }
      }
    }
    return max;
  }, [heatmapData]);

  // Get color intensity based on value
  const getColorIntensity = (value: number) => {
    if (maxValue === 0 || !isFinite(value) || isNaN(value)) return "bg-neutral-200 dark:bg-neutral-800";

    // Calculate intensity level 1-10
    const ratio = value / maxValue;

    // Use predefined opacity classes that are guaranteed to exist in Tailwind
    if (ratio < 0.1) return "bg-emerald-500 bg-opacity-10";
    if (ratio < 0.2) return "bg-emerald-500 bg-opacity-20";
    if (ratio < 0.3) return "bg-emerald-500 bg-opacity-30";
    if (ratio < 0.4) return "bg-emerald-500 bg-opacity-40";
    if (ratio < 0.5) return "bg-emerald-500 bg-opacity-50";
    if (ratio < 0.6) return "bg-emerald-500 bg-opacity-60";
    if (ratio < 0.7) return "bg-emerald-500 bg-opacity-70";
    if (ratio < 0.8) return "bg-emerald-500 bg-opacity-80";
    if (ratio < 0.9) return "bg-emerald-500 bg-opacity-90";
    return "bg-emerald-500";
  };

  // Format the metric value based on its type
  const formatMetricValue = (value: number): string => {
    if (value === 0 || isNaN(value) || !isFinite(value)) return "0";

    switch (metric) {
      case "bounce_rate":
        return `${value.toFixed(2)}%`;
      case "pages_per_session":
        return value.toFixed(2);
      case "session_duration":
        // Format as minutes and seconds
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60);
        return `${minutes}m ${seconds}s`;
      default:
        return Math.round(value).toString();
    }
  };

  // Get a friendly name for the metric
  const getMetricDisplayName = (metric: StatType): string => {
    switch (metric) {
      case "users":
        return "Unique Visitors";
      case "pageviews":
        return "Pageviews";
      case "sessions":
        return "Sessions";
      case "bounce_rate":
        return "Bounce Rate";
      case "pages_per_session":
        return "Pages per Session";
      case "session_duration":
        return "Session Duration";
      default:
        return metric;
    }
  };

  return (
    <Card>
      {isFetching && <CardLoader />}
      <CardContent className="mt-2">
        <div className="flex flex-row items-center justify-between">
          <Tabs defaultValue="pages" value={"pages"}>
            <TabsList>
              <TabsTrigger value="pages">Weekly Trends</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={metric} onValueChange={value => setMetric(value as StatType)}>
            <SelectTrigger className="w-[160px]" size="sm">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="users">Unique Visitors</SelectItem>
              <SelectItem value="pageviews">Pageviews</SelectItem>
              <SelectItem value="sessions">Sessions</SelectItem>
              <SelectItem value="bounce_rate">Bounce Rate</SelectItem>
              <SelectItem value="pages_per_session">Pages per Session</SelectItem>
              <SelectItem value="session_duration">Session Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex mt-1 p-2">
          <div className="w-12">
            {/* Empty top-left cell */}
            <div className="h-5"></div>

            {/* Time labels - only display every other hour */}
            {Array(24)
              .fill(0)
              .map((_, hour) => (
                <div key={hour} className="h-4 text-xs flex items-center justify-end pr-2 text-neutral-600 dark:text-neutral-400">
                  {hour % 2 === 1 ? hourLabels[hour] : ""}
                </div>
              ))}
          </div>

          <div className="flex-1">
            {/* Day labels */}
            <div className="flex h-5">
              {shortDayNames.map((day, i) => (
                <div key={i} className="flex-1 text-center text-xs text-neutral-600 dark:text-neutral-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {Array(24)
              .fill(0)
              .map((_, hour) => (
                <div key={hour} className="flex h-4">
                  {Array(7)
                    .fill(0)
                    .map((_, day) => {
                      const value =
                        heatmapData &&
                        heatmapData.length > day &&
                        Array.isArray(heatmapData[day]) &&
                        heatmapData[day].length > hour
                          ? heatmapData[day][hour]
                          : 0;
                      const colorClass = value > 0 ? getColorIntensity(value) : "bg-neutral-200 dark:bg-neutral-800";
                      return (
                        <Tooltip key={day}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "flex-1 mx-0.5 hover:ring-1 hover:ring-emerald-300 transition-all rounded-sm my-0.5",
                                colorClass
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="flex flex-col gap-1 p-2">
                            <div className="font-medium text-sm">
                              {longDayNames[day]} {formatLocalTime(hour, 0)} - {formatLocalTime(hour, 59)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{formatMetricValue(value)}</span>
                              <span className="text-neutral-400 text-xs">{getMetricDisplayName(metric)}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
