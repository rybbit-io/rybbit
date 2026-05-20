"use client";

import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";
import { Tilt_Warp } from "next/font/google";
import Link from "next/link";
import { useGetBotTimeSeries } from "../../../../api/analytics/hooks/bots/useGetBotTimeSeries";
import { BucketSelection } from "../../../../components/BucketSelection";
import { ChartTooltip } from "../../../../components/charts/ChartTooltip";
import { RybbitTextLogo } from "../../../../components/RybbitLogo";
import { Card, CardContent, CardLoader } from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useWhiteLabel } from "../../../../hooks/useIsWhiteLabel";
import { authClient } from "../../../../lib/auth";
import { formatChartDateTime, hour12, userLocale } from "../../../../lib/dateTimeUtils";
import { useNivoTheme } from "../../../../lib/nivo";
import { getTimezone, useStore } from "../../../../lib/store";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export function BotChart() {
  const session = authClient.useSession();
  const { site, bucket } = useStore();
  const timezone = getTimezone();
  const nivoTheme = useNivoTheme();
  const { isWhiteLabel } = useWhiteLabel();

  const { data: timeSeriesData, isLoading, isFetching } = useGetBotTimeSeries({ site });

  const processedData =
    timeSeriesData?.data
      ?.map(item => {
        const timestamp = DateTime.fromSQL(item.time, { zone: timezone }).toUTC();
        if (timestamp > DateTime.now()) return null;
        return {
          time: timestamp.toFormat("yyyy-MM-dd HH:mm:ss"),
          bot_requests: item.bot_requests,
        };
      })
      .filter(item => item !== null) ?? [];

  const data = [
    {
      id: "Bot requests",
      color: "hsl(var(--red-400))",
      data: processedData.map(item => ({
        x: item.time,
        y: item.bot_requests,
      })),
    },
  ].filter(series => series.data.length > 0);

  const formatXAxisValue = (value: any) => {
    const dt = DateTime.fromJSDate(value, { zone: "utc" }).setZone(timezone).setLocale(userLocale);
    if (
      bucket === "hour" ||
      bucket === "minute" ||
      bucket === "five_minutes" ||
      bucket === "ten_minutes" ||
      bucket === "fifteen_minutes"
    ) {
      return dt.toFormat(hour12 ? "ha" : "HH:mm");
    }
    return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
  };

  return (
    <Card className="overflow-visible">
      {isFetching && (
        <div className="absolute inset-x-0 top-0 h-4 overflow-hidden rounded-t-lg pointer-events-none">
          <CardLoader />
        </div>
      )}
      <CardContent className="p-2 md:p-4 py-3 w-full">
        <div className="flex items-center justify-between px-2 md:px-0">
          <div className="flex items-center space-x-4">
            {!isWhiteLabel && (
              <Link href={session.data ? "/" : "https://rybbit.com"} className="opacity-75">
                <RybbitTextLogo width={80} />
              </Link>
            )}
          </div>
          <span className="text-sm text-neutral-700 dark:text-neutral-200">Bot requests</span>
          <BucketSelection />
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="w-full h-[300px] rounded-md" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] w-full flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <p className="text-lg font-medium">No bot data available</p>
              <p className="text-sm">Try adjusting your date range or filters</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveLine
              data={data}
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
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
              }}
              enableGridX={true}
              enableGridY={true}
              gridYValues={5}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 10,
                tickRotation: 0,
                truncateTickAt: 0,
                format: formatXAxisValue,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 10,
                tickRotation: 0,
                truncateTickAt: 0,
                tickValues: 5,
                format: value => Number(value).toLocaleString(),
              }}
              colors={d => d.color}
              enableTouchCrosshair={true}
              enablePoints={false}
              useMesh={true}
              animate={false}
              enableSlices="x"
              enableArea={true}
              lineWidth={1}
              sliceTooltip={({ slice }: any) => {
                const currentTime = DateTime.fromJSDate(new Date(slice.points[0].data.x), { zone: "utc" }).setZone(
                  timezone
                );

                return (
                  <ChartTooltip>
                    <div className="p-3 min-w-[150px]">
                      <div className="mb-2">{formatChartDateTime(currentTime, bucket)}</div>
                      {slice.points.map((point: any) => (
                        <div key={point.seriesId} className="flex justify-between items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: point.seriesColor }} />
                            <span>{point.seriesId}</span>
                          </div>
                          <span className="font-medium">{Number(point.data.yFormatted).toLocaleString()}</span>
                        </div>
                      ))}
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
