"use client";
import { useNivoTheme } from "@/lib/nivo";
import { useStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";
import { GetOverviewBucketedResponse } from "../../../../../api/analytics/useGetOverviewBucketed";
import { APIResponse } from "../../../../../api/types";
import { Time } from "../../../../../components/DateSelector/types";
import { TimeBucket } from "@rybbit/shared";

const getMin = (time: Time, bucket: TimeBucket) => {
  if (time.mode === "day") {
    const dayDate = DateTime.fromISO(time.day).startOf("day");
    return dayDate.toJSDate();
  } else if (time.mode === "week") {
    const weekDate = DateTime.fromISO(time.week).startOf("week");
    return weekDate.toJSDate();
  } else if (time.mode === "month") {
    const monthDate = DateTime.fromISO(time.month).startOf("month");
    return monthDate.toJSDate();
  } else if (time.mode === "year") {
    const yearDate = DateTime.fromISO(time.year).startOf("year");
    return yearDate.toJSDate();
  }
  // else if (time.mode === "past-minutes") {
  //   if (bucket === "hour") {
  //     return DateTime.now()
  //       .setZone("UTC")
  //       .minus({ minutes: time.past_minutes_start * 2 })
  //       .startOf("hour")
  //       .toJSDate();
  //   }
  //   undefined;
  // }
  return undefined;
};

export function PreviousChart({
  data,
  max,
}: {
  data: APIResponse<GetOverviewBucketedResponse> | undefined;
  max: number;
}) {
  const { previousTime: time, selectedStat, bucket, showUsersSplit } = useStore();
  const { resolvedTheme } = useTheme();
  const nivoTheme = useNivoTheme();

  const showUserBreakdown = selectedStat === "users" && showUsersSplit;
  const previousColors = showUserBreakdown
    ? resolvedTheme === "dark"
      ? ["hsl(var(--dataviz) / 0.32)", "hsl(var(--pink-800) / 0.35)"]
      : ["hsl(var(--dataviz) / 0.32)", "hsl(var(--pink-200) / 0.38)"]
    : resolvedTheme === "dark"
      ? ["hsl(var(--neutral-700))", "hsl(var(--neutral-500))"]
      : ["hsl(var(--neutral-100))", "hsl(var(--neutral-300))"];

  const seriesConfig: { id: string; dataKey: keyof GetOverviewBucketedResponse[number]; color: string }[] =
    showUserBreakdown
      ? [
          { id: "new_users", dataKey: "new_users", color: previousColors[0] },
          { id: "returning_users", dataKey: "returning_users", color: previousColors[1] },
        ]
      : [{ id: selectedStat, dataKey: selectedStat, color: previousColors[0] }];

  const size = (data?.data.length ?? 0 / 2) + 1;
  const chartData = seriesConfig.map(series => {
    const points =
      data?.data
        ?.map(e => {
          const timestamp = DateTime.fromSQL(e.time).toUTC();
          if (timestamp > DateTime.now()) {
            return null;
          }

          return {
            x: timestamp.toFormat("yyyy-MM-dd HH:mm:ss"),
            y: (e as any)[series.dataKey] ?? 0,
          };
        })
        ?.filter(point => point !== null)
        ?.slice(0, size) ?? [];

    return {
      id: series.id,
      data: points,
    };
  });

  const colorMap = seriesConfig.reduce<Record<string, string>>((acc, series) => {
    acc[series.id] = series.color;
    return acc;
  }, {});

  const min = getMin(time, bucket);
  const maxPastMinutes =
    time.mode === "past-minutes" && bucket === "hour"
      ? DateTime.now().setZone("UTC").minus({ minutes: time.pastMinutesStart }).startOf("hour").toJSDate()
      : undefined;

  return (
    <ResponsiveLine
      data={chartData}
      theme={nivoTheme}
      margin={{ top: 10, right: 15, bottom: 30, left: 40 }}
      xScale={{
        type: "time",
        format: "%Y-%m-%d %H:%M:%S",
        precision: "second",
        useUTC: true,
        min,
        // max: maxPastMinutes,
      }}
      yScale={{
        type: "linear",
        min: 0,
        stacked: showUserBreakdown,
        reverse: false,
        max: Math.max(max, 1),
      }}
      enableGridX={false}
      enableGridY={false}
      yFormat=" >-.2f"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 10,
        tickRotation: 0,
        truncateTickAt: 0,
        tickValues: 0,
        format: value => {
          const localTime = DateTime.fromJSDate(value).toLocal();

          if ((time.mode === "past-minutes" && time.pastMinutesStart >= 1440) || time.mode === "day") {
            return localTime.toFormat("ha");
          } else if (time.mode === "range") {
            return localTime.toFormat("MMM d");
          } else if (time.mode === "week") {
            return localTime.toFormat("MMM d");
          } else if (time.mode === "month") {
            return localTime.toFormat("MMM d");
          }
          return "";
        },
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 10,
        tickRotation: 0,
        truncateTickAt: 0,
        tickValues: 0,
      }}
      enableTouchCrosshair={true}
      enablePoints={false}
      useMesh={true}
      animate={false}
      // motionConfig="stiff"
      enableSlices={"x"}
      colors={({ id }) => colorMap[id as string] ?? (resolvedTheme === "dark" ? "hsl(var(--neutral-700))" : "hsl(var(--neutral-100))")}
    />
  );
}
