"use client";

import { ResponsiveLine } from "@nivo/line";
import { useNivoTheme } from "@/lib/nivo";
import { InsertRate } from "@/api/admin/endpoints/clickhouseStats";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { DateTime } from "luxon";
import { userLocale } from "@/lib/dateTimeUtils";
import { useWindowSize } from "@uidotdev/usehooks";

interface InsertRateChartProps {
  insertRate: InsertRate[] | undefined;
  isLoading: boolean;
  isUnavailable?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return num.toString();
}

export function InsertRateChart({ insertRate, isLoading, isUnavailable }: InsertRateChartProps) {
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

  if (isUnavailable) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400">
        <p>Feature unavailable</p>
        <p className="text-xs mt-1">system.query_log is disabled to save disk space</p>
      </div>
    );
  }

  if (!insertRate || insertRate.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
        No insert rate data available
      </div>
    );
  }

  const chartData = [
    {
      id: "Rows Inserted",
      data: insertRate.map(row => ({
        x: row.hour,
        y: row.totalRowsInserted,
        insertCount: row.insertCount,
        currentTime: DateTime.fromSQL(row.hour, { zone: "utc" }),
      })),
    },
  ];

  const maxValue = Math.max(...insertRate.map(r => r.totalRowsInserted), 1);

  return (
    <div className="h-64">
      <ResponsiveLine
        data={chartData}
        theme={nivoTheme}
        margin={{ top: 10, right: 10, bottom: 25, left: 50 }}
        xScale={{
          type: "time",
          format: "%Y-%m-%d %H:%M:%S",
          precision: "hour",
          useUTC: true,
        }}
        yScale={{
          type: "linear",
          min: 0,
          max: maxValue,
          stacked: false,
        }}
        enableGridX={false}
        enableGridY={true}
        gridYValues={5}
        yFormat=" >-.0f"
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: 0,
          tickValues: Math.min(maxTicks, 12),
          format: value => {
            const dt = DateTime.fromJSDate(value).setLocale(userLocale);
            return dt.toFormat("HH:mm");
          },
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: 0,
          tickValues: 5,
          format: formatNumber,
        }}
        enablePoints={false}
        useMesh={true}
        animate={false}
        enableSlices="x"
        colors={["hsl(var(--dataviz))"]}
        enableArea={true}
        areaOpacity={0.1}
        sliceTooltip={({ slice }) => {
          const point = slice.points[0];
          const data = point?.data as any;
          const currentTime = data?.currentTime as DateTime | undefined;

          return (
            <ChartTooltip>
              <div className="p-3 min-w-[140px]">
                <div className="font-medium mb-1">
                  {currentTime?.toLocaleString(DateTime.DATETIME_SHORT) ?? "Unknown"}
                </div>
                <div className="flex justify-between gap-4">
                  <span>Rows inserted:</span>
                  <span>{formatNumber(Number(point?.data.yFormatted ?? 0))}</span>
                </div>
                <div className="flex justify-between gap-4 text-neutral-500">
                  <span>Insert queries:</span>
                  <span>{data?.insertCount ?? 0}</span>
                </div>
              </div>
            </ChartTooltip>
          );
        }}
      />
    </div>
  );
}
