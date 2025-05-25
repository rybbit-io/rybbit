"use client";
import { nivoTheme } from "@/lib/nivo";
import { ResponsiveLine } from "@nivo/line";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { useGetOrgEventCount } from "../api/analytics/useGetOrgEventCount";
import { userLocale, hour12 } from "../lib/dateTimeUtils";

export const formatter = Intl.NumberFormat(userLocale, { notation: "compact" });

interface UsageChartProps {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
}

export function UsageChart({
  organizationId,
  startDate,
  endDate,
  timeZone = "UTC",
}: UsageChartProps) {
  const { width } = useWindowSize();

  // Fetch the data inside the component
  const { data, isLoading, error } = useGetOrgEventCount({
    organizationId,
    startDate,
    endDate,
    timeZone,
    enabled: !!organizationId,
  });

  const maxTicks = Math.round((width ?? Infinity) / 200);

  const formattedData =
    data?.data
      ?.map((e) => {
        // Parse timestamp properly - now it's a date instead of datetime
        const timestamp = DateTime.fromSQL(e.event_date).toUTC();

        // filter out dates from the future
        if (timestamp > DateTime.now()) {
          return null;
        }

        return {
          x: timestamp.toFormat("yyyy-MM-dd"),
          y: e.event_count,
          currentTime: timestamp,
        };
      })
      .filter((e) => e !== null) || [];

  const chartData = [
    {
      id: "events",
      data: formattedData,
    },
  ];

  const maxValue = Math.max(...formattedData.map((d) => d.y), 1);

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Loading usage data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Failed to load usage data
        </div>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveLine
        data={chartData}
        theme={nivoTheme}
        margin={{ top: 10, right: 10, bottom: 25, left: 35 }}
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
          format: (value) => {
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
          format: formatter.format,
        }}
        enableTouchCrosshair={true}
        enablePoints={false}
        useMesh={true}
        animate={false}
        enableSlices={"x"}
        colors={["hsl(var(--dataviz))"]}
        enableArea={true}
        areaBaselineValue={0}
        areaOpacity={0.3}
        defs={[
          {
            id: "gradient",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "hsl(var(--dataviz))", opacity: 1 },
              { offset: 100, color: "hsl(var(--dataviz))", opacity: 0 },
            ],
          },
        ]}
        fill={[
          {
            match: {
              id: "events",
            },
            id: "gradient",
          },
        ]}
        sliceTooltip={({ slice }: any) => {
          const currentY = Number(slice.points[0].data.yFormatted);
          const currentTime = slice.points[0].data.currentTime as DateTime;

          return (
            <div className="text-sm bg-neutral-900 p-2 rounded-md">
              <div className="flex justify-between text-sm w-36">
                <div>{formatDateTime(currentTime)}</div>
                <div>{currentY.toLocaleString()} events</div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

const formatDateTime = (dt: DateTime) => {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return new Intl.DateTimeFormat(userLocale, options).format(dt.toJSDate());
};
