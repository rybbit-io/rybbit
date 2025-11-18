"use client";

import { GetErrorBucketedResponse } from "@/api/analytics/errors/useGetErrorBucketed";
import { hour12, userLocale } from "@/lib/dateTimeUtils";
import { useNivoTheme } from "@/lib/nivo";
import { ResponsiveBar } from "@nivo/bar";
import { DateTime } from "luxon";
import { useMemo } from "react";

interface ErrorSparklineChartProps {
  data: GetErrorBucketedResponse | undefined;
  isHovering: boolean;
  errorMessage: string;
  isLoading: boolean;
}

export function ErrorSparklineChart({ data, isHovering, errorMessage, isLoading }: ErrorSparklineChartProps) {
  const nivoTheme = useNivoTheme();

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    return data
      .filter(e => {
        // Filter out dates from the future
        return DateTime.fromSQL(e.time).toUTC() <= DateTime.now();
      })
      .map(e => ({
        time: DateTime.fromSQL(e.time).toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
        errors: e.error_count || 0,
      }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center animate-pulse">
        <div className="h-[1px] w-full bg-border opacity-50"></div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="h-[1px] w-full bg-border opacity-50"></div>
      </div>
    );
  }

  return (
    <ResponsiveBar
      data={chartData}
      keys={["errors"]}
      indexBy="time"
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      padding={0.3}
      valueScale={{ type: "linear" }}
      indexScale={{ type: "band", round: true }}
      colors={[isHovering ? "hsl(var(--dataviz-2))" : "hsl(var(--dataviz))"]}
      theme={nivoTheme}
      axisTop={null}
      axisRight={null}
      axisBottom={null}
      axisLeft={null}
      enableLabel={false}
      enableGridX={false}
      enableGridY={false}
      tooltip={({
        id,
        value,
        data,
      }: {
        id: string | number;
        value: number;
        data: { time: string; errors: number };
      }) => {
        const currentTime = DateTime.fromFormat(data.time, "yyyy-MM-dd HH:mm:ss", { zone: "utc" }).toLocal();
        const currentY = Number(value);

        return (
          <div
            className="bg-neutral-150 dark:bg-neutral-850 p-2 rounded-md text-xs border border-neutral-300 dark:border-neutral-750 shadow-lg"
            style={{ zIndex: 9999, position: "relative" }}
          >
            <div className="font-semibold mb-1 text-neutral-700 dark:text-neutral-200">
              {formatDateTime(currentTime)}
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-red-400">
                {currentY.toLocaleString()} {currentY === 1 ? "error" : "errors"}
              </span>
            </div>
          </div>
        );
      }}
      animate={true}
      motionConfig="gentle"
      borderRadius={1}
    />
  );
}

const formatDateTime = (dt: DateTime) => {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: hour12,
  };

  return new Intl.DateTimeFormat(userLocale, options).format(dt.toJSDate());
};
