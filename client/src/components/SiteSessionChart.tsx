import { useNivoTheme } from "@/lib/nivo";
import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { GetOverviewBucketedResponse } from "../api/analytics/endpoints";
import { hour12 } from "../lib/dateTimeUtils";
import { formatter } from "../lib/utils";
import { ChartTooltip } from "./charts/ChartTooltip";

interface SiteSessionChartProps {
  data: GetOverviewBucketedResponse;
  height?: number | string;
}

export function SiteSessionChart({ data, height = 100 }: SiteSessionChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ id: "sessions", data: [] }];
    }

    return [
      {
        id: "sessions",
        data: data.map(point => {
          return {
            x: DateTime.fromSQL(point.time).toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
            y: point.sessions,
            currentTime: DateTime.fromSQL(point.time),
          };
        }),
      },
    ];
  }, [data]);
  const nivoTheme = useNivoTheme();

  return (
    <div style={{ height }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 10, right: 10, bottom: 20, left: 25 }}
        xScale={{
          type: "time",
          format: "%Y-%m-%d %H:%M:%S",
          precision: "second",
          useUTC: true,
        }}
        yScale={{
          type: "linear",
          min: 0,
          max: "auto",
        }}
        curve="linear"
        enableSlices={"x"}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          tickValues: 3,
          format: value => {
            const time = DateTime.fromJSDate(value);
            return time.toFormat(hour12 ? "ha" : "HH:mm");
          },
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          tickValues: 2,
          format: formatter,
        }}
        enableGridX={false}
        enableGridY={false}
        enablePoints={false}
        enableArea={true}
        areaOpacity={0.3}
        colors={["hsl(var(--accent-400))"]}
        theme={nivoTheme}
        defs={[
          {
            id: "gradientA",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "hsl(var(--accent-400))", opacity: 1 },
              { offset: 100, color: "hsl(var(--accent-400))", opacity: 0 },
            ],
          },
        ]}
        fill={[{ match: "*", id: "gradientA" }]}
        sliceTooltip={({ slice }: any) => {
          const currentY = Number(slice.points[0].data.yFormatted);
          const currentTime = slice.points[0].data.currentTime as DateTime;

          return (
            <ChartTooltip>
              <div className="p-2">
                <div className="text-xs mb-1">Sessions</div>
                <div className="flex justify-between text-xs w-20">
                  <div className="text-muted-foreground">{currentTime.toFormat(hour12 ? "ha" : "HH:mm")}</div>
                  <div className="font-medium">{currentY.toLocaleString()}</div>
                </div>
              </div>
            </ChartTooltip>
          );
        }}
      />
    </div>
  );
}
