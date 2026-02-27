"use client";

import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { parseUtcTimestamp, userLocale } from "@/lib/dateTimeUtils";
import { useNivoTheme } from "@/lib/nivo";
import { formatter } from "@/lib/utils";
import { DateTime } from "luxon";
import { useWindowSize } from "@uidotdev/usehooks";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface GrowthChartProps {
  data?: Array<{ createdAt: string }>;
  color?: string;
  title: string;
}

export function GrowthChart({ data, color = "#3b82f6", title }: GrowthChartProps) {
  const { width } = useWindowSize();
  const maxTicks = Math.round((width ?? Infinity) / 200);
  const nivoTheme = useNivoTheme();
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group data by date
    const dailyCounts = new Map<string, number>();

    data.forEach(item => {
      const date = parseUtcTimestamp(item.createdAt).toFormat("yyyy-MM-dd");
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });

    // Convert to chart format and sort by date
    const chartPoints = Array.from(dailyCounts.entries())
      .map(([date, count]) => ({
        x: date,
        y: count,
        currentTime: DateTime.fromISO(date),
      }))
      .sort((a, b) => a.currentTime.toMillis() - b.currentTime.toMillis());

    return [
      {
        id: title.toLowerCase(),
        data: chartPoints,
      },
    ];
  }, [data]);

  if (data === undefined) {
    return (
      <div className="h-64 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveLine
        data={chartData}
        theme={nivoTheme}
        margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
        xScale={{
          type: "time",
          format: "%Y-%m-%d",
          precision: "day",
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
        yFormat=" >-.0f"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: 0,
          truncateTickAt: 0,
          tickValues: Math.min(maxTicks, 10),
          format: value => {
            const dt = DateTime.fromJSDate(value).setLocale(userLocale);
            return dt.toFormat("MMM d");
          },
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: 0,
          truncateTickAt: 0,
          tickValues: 5,
          format: formatter,
        }}
        enableTouchCrosshair={true}
        enablePoints={false}
        useMesh={true}
        animate={false}
        enableSlices={"x"}
        colors={[color]}
        enableArea={false}
        sliceTooltip={({ slice }: any) => {
          const point = slice.points[0];

          return (
            <ChartTooltip>
              <div className="p-3 min-w-[100px]">
                <div className="font-medium mb-1">{point.data.currentTime.toLocaleString(DateTime.DATE_SHORT)}</div>
                <div className="flex justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: point.seriesColor }} />
                    <span>New {title}</span>
                  </div>
                  <div>{formatter(Number(point.data.yFormatted))}</div>
                </div>
              </div>
            </ChartTooltip>
          );
        }}
      />
    </div>
  );
}
