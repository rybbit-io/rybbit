"use client";
import { nivoTheme } from "@/lib/nivo";
import { StatType, TimeBucket, useStore } from "@/lib/store";
import { ResponsiveLine, CustomLayer, CustomLayerProps } from "@nivo/line";
import type { ScaleLinear } from '@nivo/scales'
import { DateTime } from "luxon";
import { formatSecondsAsMinutesAndSeconds } from "../../../../../lib/utils";
import { APIResponse } from "../../../../../api/types";
import { GetOverviewBucketedResponse } from "../../../../../api/analytics/useGetOverviewBucketed";
import { Time } from "../../../../../components/DateSelector/types";
import { useWindowSize } from "@uidotdev/usehooks";

type DashedLineProps = Omit<CustomLayerProps, 'xScale' | 'yScale'> & {
  xScale: ScaleLinear<number>
  yScale: ScaleLinear<number>
}

export const formatter = Intl.NumberFormat("en", { notation: "compact" });

const getMax = (time: Time, bucket: TimeBucket) => {
  const now = DateTime.now();
  if (time.mode === "day") {
    const dayDate = DateTime.fromISO(time.day)
      .endOf("day")
      .minus({
        minutes:
          bucket === "hour"
            ? 59
            : bucket === "fifteen_minutes"
            ? 14
            : bucket === "ten_minutes"
            ? 9
            : bucket === "five_minutes"
            ? 4
            : 0,
      });
    return now < dayDate ? dayDate.toJSDate() : undefined;
  } else if (time.mode === "range") {
    if (bucket === "hour") {
      const endDate = DateTime.fromISO(time.endDate).endOf("day").minus({
        minutes: 59,
      });
      return now < endDate ? endDate.toJSDate() : undefined;
    }
    return undefined;
  } else if (time.mode === "week") {
    if (bucket === "hour") {
      const endDate = DateTime.fromISO(time.week).endOf("week").minus({
        minutes: 59,
      });
      return now < endDate ? endDate.toJSDate() : undefined;
    }
    return undefined;
  } else if (time.mode === "month") {
    const monthDate = DateTime.fromISO(time.month).endOf("month");
    return now < monthDate ? monthDate.toJSDate() : undefined;
  } else if (time.mode === "year") {
    const yearDate = DateTime.fromISO(time.year).endOf("year");
    return now < yearDate ? yearDate.toJSDate() : undefined;
  }
  return undefined;
};

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
  } else if (time.mode === "range") {
    const startDate = DateTime.fromISO(time.startDate).startOf("day");
    const endDate = DateTime.fromISO(time.endDate).startOf("day");
    return startDate.toJSDate();
  }
  return undefined;
};

const formatTooltipValue = (value: number, selectedStat: StatType): string => {
  if (selectedStat === "bounce_rate") {
    return `${value.toFixed(1)}%`;
  }
  if (selectedStat === "session_duration") {
    return formatSecondsAsMinutesAndSeconds(value);
  }
  return value.toLocaleString();
};

const Y_TICK_VALUES = 5;

export function Chart({
  data,
  previousData,
  max,
}: {
  data: APIResponse<GetOverviewBucketedResponse> | undefined;
  previousData: APIResponse<GetOverviewBucketedResponse> | undefined;
  max: number;
}) {
  const { time, bucket, selectedStat } = useStore();
  const { width } = useWindowSize();

  const maxTicks = Math.round((width ?? Infinity) / 75);

  // When the current period has more datapoints than the previous period,
  // we need to shift the previous datapoints to the right by the difference in length
  const lengthDiff = Math.max(
    (data?.data?.length ?? 0) - (previousData?.data?.length ?? 0),
    0
  );

  const formattedData = data?.data
    ?.map((e, i) => {
      // filter out dates from the future
      if (DateTime.fromSQL(e.time).toUTC() > DateTime.now()) {
        return null;
      }

      return {
        x: DateTime.fromSQL(e.time).toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
        y: e[selectedStat],
        previousY:
          i >= lengthDiff && previousData?.data?.[i - lengthDiff][selectedStat],
        currentTime: DateTime.fromSQL(e.time),
        previousTime:
          i >= lengthDiff
            ? DateTime.fromSQL(previousData?.data?.[i - lengthDiff]?.time ?? "")
            : undefined,
      };
    })
    .filter((e) => e !== null) || [];

  const displayDashed = time.mode === "day" && // display dashed only if current mode it DAY
    time.day === DateTime.now().toISODate() && // display dashed only if day its TODAY
    bucket === "hour" && // display dashed only if its by hours representation
    formattedData.length > 1; // display dashed only if there two and more datapoints

  const baseGradient = {
    offset: 0,
    color: "hsl(var(--dataviz))",
  };

  const croppedData = formattedData.slice(0, -1);

  // add original data and styles to chart
  const chartPropsData = [{
    id: "croppedData",
    data: displayDashed ? croppedData : formattedData,
  }];
  const chartPropsDefs = [{
    id: "croppedData",
    type: "linearGradient",
    colors: [
      { ...baseGradient, opacity: 1 },
      { offset: 100, color: baseGradient.color, opacity: 0 },
    ],
  }];
  const chartPropsFill = [{
    id: "croppedData",
    match: {
      id: "croppedData"
    },
  }];

  // add dashed data and styles to chart
  if (displayDashed) {
    chartPropsData.push({
      id: "dashedData",
      data: [croppedData.at(-1)!, formattedData.at(-1)!],
    });
    chartPropsDefs.push({
      id: "dashedData",
      type: "linearGradient",
      colors: [
        { ...baseGradient, opacity: 0.35 },
        { offset: 100, color: baseGradient.color, opacity: 0 },
      ],
    });
    chartPropsFill.push({
      id: "dashedData",
      match: {
        id: "dashedData"
      },
    });
  }

  const DashedLine: CustomLayer = ({
    series,
    lineGenerator,
    xScale,
    yScale,
  }: DashedLineProps) => {
    return series.map(({ id, data, color }) => (
      <path
        key={id.toString()}
        d={
          lineGenerator(
            data.map(d => ({
              x: xScale(d.data.x as number),
              y: yScale(d.data.y as number),
            }))
          )!
        }
        fill="none"
        stroke={color}
        style={
          id === "dashedData"
            ? { strokeDasharray: "3, 6", strokeWidth: 3 }
            : { strokeWidth: 2 }
        }
      />
    ));
  }

  return (
    <ResponsiveLine
      data={chartPropsData}
      theme={nivoTheme}
      margin={{ top: 10, right: 10, bottom: 25, left: 35 }}
      xScale={{
        type: "time",
        format: "%Y-%m-%d %H:%M:%S",
        precision: "second",
        useUTC: true,
        max: getMax(time, bucket),
        min: getMin(time, bucket),
      }}
      yScale={{
        type: "linear",
        min: 0,
        stacked: false,
        reverse: false,
        max: Math.max(max, 1),
      }}
      enableGridX={false}
      enableGridY={true}
      gridYValues={Y_TICK_VALUES}
      yFormat=" >-.2f"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
        truncateTickAt: 0,
        tickValues: Math.min(
          maxTicks,
          time.mode === "day" ? 24 : Math.min(12, data?.data?.length ?? 0)
        ),
        format: (value) => {
          if (time.mode === "day") {
            return DateTime.fromJSDate(value).toFormat("ha");
          } else if (time.mode === "range") {
            return DateTime.fromJSDate(value).toFormat("MMM d");
          } else if (time.mode === "week") {
            return DateTime.fromJSDate(value).toFormat("MMM d");
          } else if (time.mode === "month") {
            return DateTime.fromJSDate(value).toFormat("MMM d");
          } else if (time.mode === "year") {
            return DateTime.fromJSDate(value).toFormat("MMM d");
          } else if (time.mode === "all-time") {
            return DateTime.fromJSDate(value).toFormat("MMM d");
          }
        },
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 10,
        tickRotation: 0,
        truncateTickAt: 0,
        tickValues: Y_TICK_VALUES,
        format: formatter.format,
      }}
      enableTouchCrosshair={true}
      enablePoints={false}
      useMesh={true}
      animate={false}
      // motionConfig="stiff"
      enableSlices={"x"}
      colors={["hsl(var(--dataviz))"]}
      enableArea={true}
      areaBaselineValue={0}
      areaOpacity={0.3}
      defs={chartPropsDefs}
      fill={chartPropsFill}
      sliceTooltip={({ slice }: any) => {
        const currentY = Number(slice.points[0].data.yFormatted);
        const previousY = Number(slice.points[0].data.previousY) || 0;
        const currentTime = slice.points[0].data.currentTime as DateTime;
        const previousTime = slice.points[0].data.previousTime as DateTime;

        const diff = currentY - previousY;
        const diffPercentage = (diff / previousY) * 100;

        return (
          <div className="text-sm bg-neutral-900 p-2 rounded-md">
            {previousY ? (
              <div
                className="text-lg font-medium"
                style={{
                  color:
                    diffPercentage > 0
                      ? "hsl(var(--green-400))"
                      : "hsl(var(--red-400))",
                }}
              >
                {diffPercentage > 0 ? "+" : ""}
                {diffPercentage.toFixed(2)}%
              </div>
            ) : null}
            <div className="flex justify-between text-sm w-36">
              <div>{formatTime(currentTime, bucket)}</div>
              <div>{formatTooltipValue(currentY, selectedStat)}</div>
            </div>
            {previousTime && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <div>{formatTime(previousTime, bucket)}</div>
                <div>{formatTooltipValue(previousY, selectedStat)}</div>
              </div>
            )}
          </div>
        );
      }}
      layers={[
        "grid",
        "markers",
        "axes",
        "areas",
        "crosshair",
        (displayDashed ? DashedLine : "lines"),
        "slices",
        "points",
        "mesh",
        "legends",
      ]}
    />
  );
}

const formatTime = (time: DateTime<boolean>, bucket: TimeBucket) => {
  if (
    bucket === "minute" ||
    bucket === "five_minutes" ||
    bucket === "ten_minutes" ||
    bucket === "fifteen_minutes"
  ) {
    return time.toFormat("M/d h:mm a");
  } else if (bucket === "hour") {
    return time.toFormat("M/d h a");
  } else {
    return time.toLocaleString();
  }
};
