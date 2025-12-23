"use client";

import { useGetAdminServiceEventCount } from "@/api/admin/useGetAdminServiceEventCount";
import { timeZone, userLocale } from "@/lib/dateTimeUtils";
import { useNivoTheme } from "@/lib/nivo";
import { formatter } from "@/lib/utils";
import { ResponsiveLine } from "@nivo/line";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface ServiceUsageChartProps {
  startDate?: string;
  endDate?: string;
  title?: string;
}

export function ServiceUsageChart({ startDate, endDate, title }: ServiceUsageChartProps) {
  const { width } = useWindowSize();
  const nivoTheme = useNivoTheme();

  // Fetch the data inside the component
  const { data, isLoading, error } = useGetAdminServiceEventCount({
    startDate,
    endDate,
    timeZone,
  });

  const maxTicks = Math.round((width ?? Infinity) / 200);

  const pageviewData =
    data?.data
      ?.map(e => {
        const timestamp = DateTime.fromSQL(e.event_date).toUTC();
        if (timestamp > DateTime.now()) return null;
        return {
          x: timestamp.toFormat("yyyy-MM-dd"),
          y: e.pageview_count,
          currentTime: timestamp,
        };
      })
      .filter(e => e !== null) || [];

  const customEventData =
    data?.data
      ?.map(e => {
        const timestamp = DateTime.fromSQL(e.event_date).toUTC();
        if (timestamp > DateTime.now()) return null;
        return {
          x: timestamp.toFormat("yyyy-MM-dd"),
          y: e.custom_event_count,
          currentTime: timestamp,
        };
      })
      .filter(e => e !== null) || [];

  const performanceData =
    data?.data
      ?.map(e => {
        const timestamp = DateTime.fromSQL(e.event_date).toUTC();
        if (timestamp > DateTime.now()) return null;
        return {
          x: timestamp.toFormat("yyyy-MM-dd"),
          y: e.performance_count,
          currentTime: timestamp,
        };
      })
      .filter(e => e !== null) || [];

  const chartData = [
    {
      id: "pageviews",
      data: pageviewData,
    },
    {
      id: "custom events",
      data: customEventData,
    },
    {
      id: "performance",
      data: performanceData,
    },
  ];

  const maxValue = Math.max(
    ...pageviewData.map(d => d.y),
    ...customEventData.map(d => d.y),
    ...performanceData.map(d => d.y),
    1
  );

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading usage data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Failed to load usage data</div>
      </div>
    );
  }

  const totalEvents = chartData.reduce((acc, curr) => acc + curr.data.reduce((acc, curr) => acc + curr.y, 0), 0);

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
          max: maxValue,
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
        colors={["hsl(var(--blue-400))", "hsl(var(--indigo-400))", "hsl(var(--violet-400))"]}
        enableArea={false}
        sliceTooltip={({ slice }: any) => {
          const currentTime = slice.points[0].data.currentTime as DateTime;

          const total = slice.points.reduce((acc: number, point: any) => acc + Number(point.data.yFormatted), 0);

          return (
            <ChartTooltip>
              <div className="p-3 min-w-[100px]">
                <div className="font-medium mb-1">{currentTime.toLocaleString(DateTime.DATE_SHORT)}</div>
                {slice.points
                  .sort((a: any, b: any) => a.seriesId.localeCompare(b.seriesId))
                  .map((point: any) => {
                    return (
                      <div key={point.serieId} className="flex justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: point.seriesColor }} />
                          <span>{point.seriesId.charAt(0).toUpperCase() + point.seriesId.slice(1)}</span>
                        </div>
                        <div>{formatter(Number(point.data.yFormatted))}</div>
                      </div>
                    );
                  })}
                <div className="mt-2 flex justify-between border-t border-neutral-100 dark:border-neutral-750 pt-2">
                  <div>Total</div>
                  <div className="font-semibold">{formatter(total)}</div>
                </div>
              </div>
            </ChartTooltip>
          );
        }}
      />
    </div>
  );
}
