"use client";

import { useNivoTheme } from "@/lib/nivo";
import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { ProcessedRetentionData, RetentionMode } from "../../../api/analytics/useGetRetention";
import { Skeleton } from "../../../components/ui/skeleton";
import { useTheme } from "next-themes";

interface RetentionChartProps {
  data: ProcessedRetentionData | undefined;
  isLoading: boolean;
  mode: RetentionMode;
}

// Vibrant color palette for different cohorts using Tailwind CSS HSL variables
const cohortColors = [
  "hsl(var(--accent-500))", // Primary accent color
  "hsl(var(--green-500))", // Green
  "hsl(var(--red-500))", // Red
  "hsl(var(--blue-500))", // Blue
  "hsl(var(--orange-500))", // Orange
  "hsl(var(--purple-500))", // Purple
  "hsl(var(--teal-500))", // Teal
  "hsl(var(--amber-500))", // Amber
  "hsl(var(--slate-600))", // Slate
  "hsl(var(--red-600))", // Darker red
  "hsl(var(--green-600))", // Darker green
  "hsl(var(--blue-600))", // Darker blue
  "hsl(var(--purple-600))", // Darker purple
  "hsl(var(--teal-600))", // Darker teal
];

// Loading skeleton
const RetentionChartSkeleton = () => (
  <div className="h-[400px] flex items-center justify-center">
    <div className="w-full space-y-3">
      <Skeleton className="h-[300px] w-full bg-neutral-100 dark:bg-neutral-900 rounded-md animate-pulse" />
      <div className="flex items-center justify-between px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4 w-12 bg-neutral-150/50 dark:bg-neutral-700/50 animate-pulse"
            style={{
              animationDelay: `${i * 100}ms`,
              opacity: 0.3 + i * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

export function RetentionChart({ data, isLoading, mode }: RetentionChartProps) {
  const { resolvedTheme } = useTheme();
  const nivoTheme = useNivoTheme();

  // Get cohort keys once for both chart data and tooltip
  const cohortKeys = useMemo(() => {
    if (!data || !data.cohorts) return [];
    return Object.keys(data.cohorts)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 12); // Limit to 12 most recent cohorts for better readability
  }, [data]);

  // Process data for the chart - organize by cohort
  const chartData = useMemo(() => {
    if (!data || !data.cohorts || cohortKeys.length === 0) {
      return [];
    }

    // Format each cohort as a series (line)
    return cohortKeys.map((cohortKey, index) => {
      const cohortData = data.cohorts[cohortKey];

      // Format the date label based on mode
      let formattedDate: string;
      const startDate = DateTime.fromISO(cohortKey);
      if (mode === "day") {
        formattedDate = startDate.toFormat("MMM dd");
      } else {
        // For weekly mode
        const endDate = startDate.plus({ days: 6 });

        // If same month, don't repeat month
        if (startDate.month === endDate.month) {
          formattedDate = `${startDate.toFormat("MMM dd")}-${endDate.toFormat("dd")}`;
        } else {
          formattedDate = `${startDate.toFormat("MMM dd")}-${endDate.toFormat("MMM dd")}`;
        }
      }

      // Create data points for each period
      const points = cohortData.percentages.map((percentage, periodIndex) => ({
        x: periodIndex,
        y: percentage ?? null,
      }));

      return {
        id: formattedDate,
        data: points.filter(point => point.y !== null), // Remove null points
        color: cohortColors[index % cohortColors.length],
      };
    });
  }, [data, mode, cohortKeys]);

  if (isLoading) {
    return <RetentionChartSkeleton />;
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-neutral-500 dark:text-neutral-400 text-sm">No retention data available</div>
      </div>
    );
  }

  // Calculate max Y value with a little headroom
  const maxY = Math.min(
    100,
    Math.max(...chartData.flatMap(series => series.data.map(d => (typeof d.y === "number" ? d.y : 0)))) * 1.1
  );

  return (
    <div className="h-[400px]">
      <ResponsiveLine
        data={chartData}
        theme={nivoTheme}
        margin={{ top: 20, right: 120, bottom: 30, left: 40 }}
        xScale={{
          type: "linear",
          min: 0,
          max: "auto",
        }}
        yScale={{
          type: "linear",
          min: 0,
          max: maxY,
          stacked: false,
        }}
        curve="linear"
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          tickValues: chartData.length,
          format: value => `${value}`,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: value => `${value}%`,
        }}
        enableGridX={true}
        gridXValues={Array.from({ length: data.maxPeriods + 1 }, (_, i) => i)}
        colors={{ datum: "color" }}
        useMesh={true}
        pointSize={0}
        legends={[
          {
            anchor: "right",
            direction: "column",
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 5,
            itemDirection: "left-to-right",
            itemWidth: 100,
            itemHeight: 20,
            itemOpacity: 0.85,
            symbolSize: 12,
            symbolShape: "circle",
            symbolBorderColor: "rgba(0, 0, 0, .5)",
            effects: [
              {
                on: "hover",
                style: {
                  itemBackground: "rgba(0, 0, 0, .1)",
                  itemOpacity: 1,
                },
              },
            ],
            itemTextColor: resolvedTheme === "dark" ? "hsl(var(--neutral-200))" : "hsl(var(--neutral-700))",
          },
        ]}
        tooltip={({ point }) => {
          const value = point.data.y as number | null;
          const xValue = point.data.x as number;

          // Find the original cohort date by matching the formatted label
          const cohortEntry = chartData.find(series => series.id === point.seriesId);
          const cohortIndex = cohortEntry ? chartData.indexOf(cohortEntry) : -1;
          const originalCohortKey = cohortIndex >= 0 && cohortKeys && cohortKeys[cohortIndex];

          // Format full date for tooltip
          let cohortDateDisplay = point.seriesId;
          if (originalCohortKey) {
            const startDate = DateTime.fromISO(originalCohortKey);
            if (mode === "day") {
              cohortDateDisplay = startDate.toFormat("MMM dd, yyyy");
            } else {
              const endDate = startDate.plus({ days: 6 });

              if (startDate.month === endDate.month) {
                cohortDateDisplay = `${startDate.toFormat("MMM dd")} - ${endDate.toFormat("dd, yyyy")}`;
              } else if (startDate.year === endDate.year) {
                cohortDateDisplay = `${startDate.toFormat("MMM dd")} - ${endDate.toFormat("MMM dd, yyyy")}`;
              } else {
                cohortDateDisplay = `${startDate.toFormat("MMM dd, yyyy")} - ${endDate.toFormat("MMM dd, yyyy")}`;
              }
            }
          }

          return (
            <div className="text-sm bg-neutral-150 dark:bg-neutral-850 p-2 rounded-md border border-neutral-300 dark:border-neutral-800 shadow-md">
              <div className="font-medium mb-1" style={{ color: point.seriesColor }}>
                Cohort: {cohortDateDisplay}
              </div>
              <div className="flex justify-between w-48 text-neutral-700 dark:text-neutral-200">
                <span>
                  {mode === "day" ? "Day" : "Week"} {xValue}
                </span>
                <span className="font-medium">{value !== null ? `${value.toFixed(1)}%` : "-"}</span>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
