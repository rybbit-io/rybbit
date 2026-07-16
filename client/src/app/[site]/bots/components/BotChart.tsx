"use client";

import { DateTime } from "luxon";
import Link from "next/link";
import { useMemo } from "react";

import { useGetBotTimeSeries } from "../../../../api/analytics/hooks/bots/useGetBotTimeSeries";
import { BucketSelection } from "../../../../components/BucketSelection";
import { ChartTooltip } from "../../../../components/charts/ChartTooltip";
import { TimeSeriesChart } from "../../../../components/charts/TimeSeriesChart";
import type { TimeSeriesChartPoint } from "../../../../components/charts/TimeSeriesChart";
import { getChartTimeBounds } from "../../../../components/charts/timeSeriesChartUtils";
import { RybbitTextLogo } from "../../../../components/RybbitLogo";
import { Card, CardContent, CardLoader } from "../../../../components/ui/card";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useWhiteLabel } from "../../../../hooks/useIsWhiteLabel";
import { authClient } from "../../../../lib/auth";
import { formatChartDateTime } from "../../../../lib/dateTimeUtils";
import { getTimezone, useStore } from "../../../../lib/store";

type BotPoint = TimeSeriesChartPoint & {
  currentTime: DateTime;
};

export function BotChart() {
  const session = authClient.useSession();
  const { site, bucket, time } = useStore();
  const timezone = getTimezone();
  const { isWhiteLabel } = useWhiteLabel();

  const { data: timeSeriesData, isLoading, isFetching } = useGetBotTimeSeries({ site });

  const { current, chartMin, chartMax, max } = useMemo(() => {
    const { min: boundsMin, max: boundsMax } = getChartTimeBounds(time, bucket, timezone);

    const now = DateTime.now();
    const lowerBoundMs = boundsMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();
    const points: BotPoint[] = [];

    timeSeriesData?.data?.forEach(item => {
      const timestamp = DateTime.fromSQL(item.time, { zone: timezone }).toUTC();
      if (timestamp > now) return;
      const timestampMs = timestamp.toMillis();
      if (lowerBoundMs !== undefined && timestampMs < lowerBoundMs) return;
      if (timestampMs > upperBoundMs) return;
      points.push({
        x: timestamp.toJSDate(),
        y: item.bot_requests,
        currentTime: timestamp,
      });
    });

    const dataMin = points.length ? points[0].x : undefined;
    const dataMax = points.length ? points[points.length - 1].x : undefined;

    return {
      current: points,
      chartMin: dataMin ?? boundsMin,
      chartMax: dataMax ?? boundsMax ?? now.toJSDate(),
      max: points.reduce((largest, point) => Math.max(largest, point.y), 0),
    };
  }, [bucket, time, timeSeriesData, timezone]);

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
        ) : current.length === 0 ? (
          <div className="h-[300px] w-full flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <p className="text-lg font-medium">No bot data available</p>
              <p className="text-sm">Try adjusting your date range or filters</p>
            </div>
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <TimeSeriesChart
              current={current}
              max={max}
              chartMin={chartMin}
              chartMax={chartMax}
              currentColor="hsl(var(--red-400))"
              yTickFormat={value => Number(value).toLocaleString()}
              renderTooltip={({ point, bucket }) => (
                <ChartTooltip>
                  <div className="p-3 min-w-[150px]">
                    <div className="mb-2">{formatChartDateTime(point.currentTime, bucket)}</div>
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: "hsl(var(--red-400))" }} />
                        <span>Bot requests</span>
                      </div>
                      <span className="font-medium">{point.y.toLocaleString()}</span>
                    </div>
                  </div>
                </ChartTooltip>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
