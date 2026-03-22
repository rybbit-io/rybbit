"use client";

import { ResponsiveLine } from "@nivo/line";
import { useNivoTheme } from "@/lib/nivo";
import { RowsByDate } from "@/api/admin/endpoints/clickhouseStats";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { DateTime } from "luxon";
import { userLocale } from "@/lib/dateTimeUtils";
import { useWindowSize } from "@uidotdev/usehooks";
import { formatter } from "@/lib/utils";

interface RowsTrendChartProps {
  rowsByDate: RowsByDate[] | undefined;
  isLoading: boolean;
  days: number;
}

export function RowsTrendChart({ rowsByDate, isLoading, days }: RowsTrendChartProps) {
  const nivoTheme = useNivoTheme();
  const { width } = useWindowSize();
  const maxTicks = Math.round((width ?? Infinity) / 100);

  if (isLoading) {
    return (
      <div className="h-64">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!rowsByDate || rowsByDate.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
        No rows trend data available
      </div>
    );
  }

  // Group by table
  const tableGroups = rowsByDate.reduce(
    (acc, row) => {
      if (!acc[row.table]) {
        acc[row.table] = [];
      }
      acc[row.table].push(row);
      return acc;
    },
    {} as Record<string, RowsByDate[]>
  );

  const colors = [
    "hsl(var(--blue-400))",
    "hsl(var(--indigo-400))",
    "hsl(var(--violet-400))",
    "hsl(var(--emerald-400))",
  ];

  // Filter to exclude bad/future dates
  const now = DateTime.now();
  const cutoff = days > 0 ? now.minus({ days }) : null;

  // Match GrowthChart pattern: use string dates directly
  const chartData = Object.entries(tableGroups).map(([table, rows]) => ({
    id: table,
    data: rows
      .map(row => {
        const dt = DateTime.fromSQL(row.date);
        return {
          x: dt.toFormat("yyyy-MM-dd"),
          y: row.rowsInserted,
          currentTime: dt,
        };
      })
      .filter(point => point.currentTime.isValid && point.currentTime <= now && (!cutoff || point.currentTime >= cutoff))
      .sort((a, b) => a.currentTime.toMillis() - b.currentTime.toMillis()),
  }));

  return (
    <div className="h-64">
      <ResponsiveLine
        data={chartData}
        theme={nivoTheme}
        margin={{ top: 10, right: 110, bottom: 25, left: 40 }}
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
        enableSlices="x"
        colors={colors}
        enableArea={false}
        legends={[
          {
            anchor: "bottom-right",
            direction: "column",
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: "left-to-right",
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: "circle",
          },
        ]}
        sliceTooltip={({ slice }: any) => {
          const point = slice.points[0];

          return (
            <ChartTooltip>
              <div className="p-3 min-w-[140px]">
                <div className="font-medium mb-1">
                  {point.data.currentTime.toLocaleString(DateTime.DATE_SHORT)}
                </div>
                {slice.points.map((point: any) => (
                  <div key={point.seriesId} className="flex justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: point.seriesColor }} />
                      <span className="text-xs truncate max-w-[80px]">{point.seriesId}</span>
                    </div>
                    <div>{formatter(Number(point.data.yFormatted))}</div>
                  </div>
                ))}
              </div>
            </ChartTooltip>
          );
        }}
      />
    </div>
  );
}
