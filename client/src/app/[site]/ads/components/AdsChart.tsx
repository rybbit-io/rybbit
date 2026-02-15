"use client";

import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";
import { useGetSiteEventCount } from "../../../../api/analytics/hooks/events/useGetSiteEventCount";
import { ChartTooltip } from "../../../../components/charts/ChartTooltip";
import { CardLoader } from "../../../../components/ui/card";
import {
  formatChartDateTime,
  hour12,
  userLocale,
} from "../../../../lib/dateTimeUtils";
import { useNivoTheme } from "../../../../lib/nivo";
import { getTimezone, useStore } from "../../../../lib/store";
import { formatter } from "../../../../lib/utils";

const Y_TICK_VALUES = 5;

export function AdsChart({
  selectedStat,
}: {
  selectedStat: "ad_click_count" | "ad_impression_count";
}) {
  const { time, bucket } = useStore();
  const nivoTheme = useNivoTheme();
  const timezone = getTimezone();
  const { data, isLoading, isFetching } = useGetSiteEventCount();

  const chartData =
    data
      ?.map((point) => {
        const timestamp = DateTime.fromSQL(point.time, { zone: timezone }).toUTC();
        if (timestamp > DateTime.now()) return null;
        return {
          x: timestamp.toFormat("yyyy-MM-dd HH:mm:ss"),
          y: point[selectedStat],
          currentTime: timestamp,
        };
      })
      .filter((e) => e !== null) || [];

  const maxY = Math.max(...chartData.map((d) => d.y), 1);

  const label =
    selectedStat === "ad_click_count" ? "Ad Clicks" : "Ad Impressions";

  return (
    <>
      {isFetching && <CardLoader />}
      <div className="h-[280px]">
        {isLoading ? null : (
          <ResponsiveLine
            data={[{ id: label, data: chartData }]}
            theme={nivoTheme}
            margin={{ top: 10, right: 15, bottom: 30, left: 40 }}
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
              max: Math.max(maxY, 1),
            }}
            enableGridX={true}
            enableGridY={true}
            gridYValues={Y_TICK_VALUES}
            yFormat=" >-.2f"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 10,
              tickRotation: 0,
              truncateTickAt: 0,
              tickValues: Math.min(12, chartData.length),
              format: (value) => {
                const dt = DateTime.fromJSDate(value, { zone: "utc" })
                  .setZone(timezone)
                  .setLocale(userLocale);
                if (time.mode === "past-minutes") {
                  if (time.pastMinutesStart < 1440) {
                    return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
                  }
                  return dt.toFormat(hour12 ? "ha" : "HH:mm");
                }
                if (time.mode === "day") {
                  return dt.toFormat(hour12 ? "ha" : "HH:mm");
                }
                return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
              },
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 10,
              tickRotation: 0,
              truncateTickAt: 0,
              tickValues: Y_TICK_VALUES,
              format: formatter,
            }}
            enableTouchCrosshair={true}
            enablePoints={false}
            useMesh={true}
            animate={false}
            enableSlices="x"
            colors={["hsl(var(--dataviz))"]}
            enableArea={true}
            areaBaselineValue={0}
            areaOpacity={0.3}
            defs={[
              {
                id: "area",
                type: "linearGradient",
                colors: [
                  { offset: 0, color: "hsl(var(--dataviz))", opacity: 1 },
                  { offset: 100, color: "hsl(var(--dataviz))", opacity: 0 },
                ],
              },
            ]}
            fill={[{ id: "area", match: { id: label } }]}
            sliceTooltip={({ slice }: any) => {
              const point = slice.points[0];
              const y = Number(point.data.yFormatted);
              const currentTime = point.data.currentTime as DateTime;
              return (
                <ChartTooltip>
                  <div className="m-2">
                    <div className="flex justify-between text-sm w-40">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 rounded-[3px] bg-dataviz" />
                        {formatChartDateTime(currentTime, bucket)}
                      </div>
                      <div>{y.toLocaleString()}</div>
                    </div>
                  </div>
                </ChartTooltip>
              );
            }}
            layers={[
              "grid",
              "markers",
              "axes",
              "areas",
              "crosshair",
              "lines",
              "slices",
              "points",
              "mesh",
              "legends",
            ]}
          />
        )}
      </div>
    </>
  );
}
