"use client";
import { TimeBucket } from "@rybbit/shared";
import { useNivoTheme } from "@/lib/nivo";
import { StatType, useStore } from "@/lib/store";
import { LineCustomSvgLayer, LineCustomSvgLayerProps, LineSeries, ResponsiveLine } from "@nivo/line";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { useTheme } from "next-themes";
import { GetOverviewBucketedResponse } from "../../../../../api/analytics/useGetOverviewBucketed";
import { APIResponse } from "../../../../../api/types";
import { Time } from "../../../../../components/DateSelector/types";
import { formatSecondsAsMinutesAndSeconds, formatter } from "../../../../../lib/utils";
import { userLocale, hour12, formatChartDateTime } from "../../../../../lib/dateTimeUtils";
import { ChartTooltip } from "../../../../../components/charts/ChartTooltip";

const getMax = (time: Time, bucket: TimeBucket) => {
  const now = DateTime.now();
  if (time.mode === "past-minutes") {
    if (bucket === "hour") {
      return DateTime.now().setZone("UTC").startOf("hour").toJSDate();
    }
    return undefined;
  } else if (time.mode === "day") {
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
    if (bucket === "day" || bucket === "week" || bucket === "month" || bucket === "year") {
      return undefined;
    }
    const rangeDate = DateTime.fromISO(time.endDate)
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
    return now < rangeDate ? rangeDate.toJSDate() : undefined;
  } else if (time.mode === "week") {
    if (bucket === "hour") {
      const endDate = DateTime.fromISO(time.week).endOf("week").minus({
        minutes: 59,
      });
      return now < endDate ? endDate.toJSDate() : undefined;
    }
    if (bucket === "fifteen_minutes") {
      const endDate = DateTime.fromISO(time.week).endOf("week").minus({
        minutes: 14,
      });
      return now < endDate ? endDate.toJSDate() : undefined;
    }
    return undefined;
  } else if (time.mode === "month") {
    if (bucket === "hour") {
      const endDate = DateTime.fromISO(time.month).endOf("month").minus({
        minutes: 59,
      });
      return now < endDate ? endDate.toJSDate() : undefined;
    }
    const monthDate = DateTime.fromISO(time.month).endOf("month");
    return now < monthDate ? monthDate.toJSDate() : undefined;
  } else if (time.mode === "year") {
    const yearDate = DateTime.fromISO(time.year).endOf("year");
    return now < yearDate ? yearDate.toJSDate() : undefined;
  }
  return undefined;
};

const getMin = (time: Time, bucket: TimeBucket) => {
  if (time.mode === "past-minutes") {
    return DateTime.now()
      .minus({ minutes: time.pastMinutesStart })
      .startOf(time.pastMinutesStart < 360 ? "minute" : "hour")
      .toJSDate();
  } else if (time.mode === "day") {
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

const SERIES_LABELS: Record<StatType | "new_users" | "returning_users", string> = {
  pageviews: "Pageviews",
  sessions: "Sessions",
  pages_per_session: "Pages per Session",
  bounce_rate: "Bounce Rate",
  session_duration: "Session Duration",
  users: "Users",
  new_users: "New Users",
  returning_users: "Returning Users",
};

type SeriesConfig = {
  id: string;
  dataKey: keyof GetOverviewBucketedResponse[number];
  label: string;
  color: string;
};

export function Chart({
  data,
  previousData,
  max,
}: {
  data: APIResponse<GetOverviewBucketedResponse> | undefined;
  previousData: APIResponse<GetOverviewBucketedResponse> | undefined;
  max: number;
}) {
  const { time, bucket, selectedStat, showUsersSplit } = useStore();
  const { width } = useWindowSize();
  const nivoTheme = useNivoTheme();
  const { resolvedTheme } = useTheme();

  const showUserBreakdown = selectedStat === "users" && showUsersSplit;

  const seriesConfig: SeriesConfig[] = showUserBreakdown
    ? [
        {
          id: "new_users",
          dataKey: "new_users",
          label: SERIES_LABELS["new_users"],
          color: "hsl(var(--dataviz))",
        },
        {
          id: "returning_users",
          dataKey: "returning_users",
          label: SERIES_LABELS["returning_users"],
          color: "hsl(var(--pink-400))",
        },
      ]
    : [
        {
          id: selectedStat,
          dataKey: selectedStat,
          label: SERIES_LABELS[selectedStat],
          color: "hsl(var(--dataviz))",
        },
      ];

  const maxTicks = Math.round((width ?? Infinity) / 75);

  // When the current period has more datapoints than the previous period,
  // we need to shift the previous datapoints to the right by the difference in length
  const lengthDiff = Math.max((data?.data?.length ?? 0) - (previousData?.data?.length ?? 0), 0);

  const currentDayStr = DateTime.now().toISODate();
  const currentMonthStr = DateTime.now().toFormat("yyyy-MM-01");
  const shouldNotDisplay =
    time.mode === "all-time" || // do not display in all-time mode
    time.mode === "year" || // do not display in year mode
    (time.mode === "month" && time.month !== currentMonthStr) || // do not display in month mode if month is not current
    (time.mode === "day" && time.day !== currentDayStr) || // do not display in day mode if day is not current
    (time.mode === "range" && time.endDate !== currentDayStr) || // do not display in range mode if end date is not current day
    (time.mode === "day" && (bucket === "minute" || bucket === "five_minutes")) || // do not display in day mode if bucket is minute or five_minutes
    (time.mode === "past-minutes" && (bucket === "minute" || bucket === "five_minutes")); // do not display in 24-hour mode if bucket is minute or five_minutes
  const seriesData = seriesConfig.map(config => {
    const points =
      data?.data
        ?.map((e, i) => {
          // Parse timestamp properly
          const timestamp = DateTime.fromSQL(e.time).toUTC();

          // filter out dates from the future
          if (timestamp > DateTime.now()) {
            return null;
          }

          const previousEntry = i >= lengthDiff ? previousData?.data?.[i - lengthDiff] : undefined;
          const previousTimestamp = previousEntry ? DateTime.fromSQL(previousEntry.time).toUTC() : undefined;

          return {
            x: timestamp.toFormat("yyyy-MM-dd HH:mm:ss"),
            y: (e as any)[config.dataKey] ?? 0,
            previousY: previousEntry ? (previousEntry as any)[config.dataKey] : undefined,
            currentTime: timestamp,
            previousTime: previousTimestamp,
          };
        })
        .filter(e => e !== null) ?? [];

    return { ...config, points };
  });

  const displayDashed = (seriesData[0]?.points.length ?? 0) >= 2 && !shouldNotDisplay;

  const chartPropsData: { id: string; data: any[] }[] = [];
  const chartPropsDefs: any[] = [];
  const chartPropsFill: any[] = [];
  const colorMap: Record<string, string> = {};

  seriesData.forEach(series => {
    const baseId = `${series.id}-base`;
    const hasEnoughPoints = series.points.length >= 2;
    const baseData = displayDashed && hasEnoughPoints ? series.points.slice(0, -1) : series.points;

    chartPropsData.push({
      id: baseId,
      data: baseData,
    });
    colorMap[baseId] = series.color;

    chartPropsDefs.push({
      id: `${baseId}-gradient`,
      type: "linearGradient",
      colors: [
        { offset: 0, color: series.color, opacity: 1 },
        { offset: 100, color: series.color, opacity: 0 },
      ],
    });
    chartPropsFill.push({
      id: `${baseId}-gradient`,
      match: {
        id: baseId,
      },
    });

    if (displayDashed && hasEnoughPoints) {
      const dashedId = `${series.id}-dashed`;
      chartPropsData.push({
        id: dashedId,
        data: series.points.slice(-2),
      });
      colorMap[dashedId] = series.color;

      chartPropsDefs.push({
        id: `${dashedId}-gradient`,
        type: "linearGradient",
        colors: [
          { offset: 0, color: series.color, opacity: 0.35 },
          { offset: 100, color: series.color, opacity: 0 },
        ],
      });
      chartPropsFill.push({
        id: `${dashedId}-gradient`,
        match: {
          id: dashedId,
        },
      });
    }
  });

  const DashedLine: LineCustomSvgLayer<LineSeries> = ({
    series,
    lineGenerator,
    xScale,
    yScale,
  }: LineCustomSvgLayerProps<LineSeries>) => {
    return series.map(({ id, data, color }) => (
      <path
        key={id}
        d={lineGenerator(data.map(d => ({ x: xScale(d.data.x), y: yScale(d.data.y) })))!}
        fill="none"
        stroke={color}
        style={String(id).endsWith("-dashed") ? { strokeDasharray: "3, 6", strokeWidth: 3 } : { strokeWidth: 2 }}
      />
    ));
  };

  return (
    <ResponsiveLine
      data={chartPropsData}
      theme={nivoTheme}
      margin={{ top: 10, right: 15, bottom: 30, left: 40 }}
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
        stacked: showUserBreakdown,
        reverse: false,
        max: Math.max(max, 1),
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
        tickValues: Math.min(
          maxTicks,
          time.mode === "day" || (time.mode === "past-minutes" && time.pastMinutesStart === 1440)
            ? 24
            : Math.min(12, data?.data?.length ?? 0)
        ),
        format: value => {
          const dt = DateTime.fromJSDate(value).setLocale(userLocale);
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
      enableSlices={"x"}
      colors={({ id }) => colorMap[id as string] ?? "hsl(var(--dataviz))"}
      enableArea={true}
      areaBaselineValue={0}
      areaOpacity={0.3}
      defs={chartPropsDefs}
      fill={chartPropsFill}
      sliceTooltip={({ slice }: any) => {
        // Normalize dashed series ids back to their base ids so we always find a point
        const normalizedPoints = slice.points.map((point: any) => ({
          ...point,
          originalSerieId: String(point.serieId),
          serieId: String(point.serieId).replace(/-dashed$/, "-base"),
        }));

        if (!normalizedPoints.length) return null;

        // Single-series tooltip (unchanged)
        if (!showUserBreakdown) {
          const currentTime = normalizedPoints[0].data.currentTime as DateTime;
          const previousTime = normalizedPoints[0].data.previousTime as DateTime;
          const currentY = Number(normalizedPoints[0].data.yFormatted ?? normalizedPoints[0].data.y);
          const previousY = Number(normalizedPoints[0].data.previousY) || 0;
          const diff = currentY - previousY;
          const diffPercentage = previousY ? (diff / previousY) * 100 : null;
          const primaryColor = colorMap[`${seriesConfig[0].id}-base`] ?? "hsl(var(--dataviz))";

          return (
            <ChartTooltip>
              {diffPercentage !== null && (
                <div
                  className="text-base font-medium px-2 pt-1.5 pb-1"
                  style={{
                    color: diffPercentage > 0 ? "hsl(var(--green-400))" : "hsl(var(--red-400))",
                  }}
                >
                  {diffPercentage > 0 ? "+" : ""}
                  {diffPercentage.toFixed(2)}%
                </div>
              )}
              <div className="w-full h-[1px] bg-neutral-100 dark:bg-neutral-750"></div>

              <div className="m-2">
                <div className="flex justify-between text-sm w-40">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: primaryColor }} />
                    {formatChartDateTime(currentTime, bucket)}
                  </div>
                  <div>{formatTooltipValue(currentY, selectedStat)}</div>
                </div>
                {previousTime && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 rounded-[3px] bg-neutral-200 dark:bg-neutral-750" />
                      {formatChartDateTime(previousTime, bucket)}
                    </div>
                    <div>{formatTooltipValue(previousY, selectedStat)}</div>
                  </div>
                )}
              </div>
            </ChartTooltip>
          );
        }

        // Two-series tooltip (new vs returning) using the slice's timestamp to fetch both series points
        const targetTime = (normalizedPoints[0].data.currentTime as DateTime | undefined)?.toMillis();

        const previousColorFor = (seriesId: string) => {
          if (seriesId === "new_users") {
            return resolvedTheme === "dark" ? "hsl(var(--dataviz) / 0.28)" : "hsl(var(--dataviz) / 0.28)";
          }
          if (seriesId === "returning_users") {
            return resolvedTheme === "dark" ? "hsl(var(--pink-800) / 0.35)" : "hsl(var(--pink-200) / 0.38)";
          }
          return resolvedTheme === "dark" ? "hsl(var(--neutral-700))" : "hsl(var(--neutral-200))";
        };

        const rows = seriesConfig
          .map(series => {
            const match = seriesData
              .find(s => s.id === series.id)
              ?.points.find(p => {
                const t = (p.currentTime as DateTime | undefined)?.toMillis();
                return targetTime !== undefined && t === targetTime;
              });

            if (!match) return null;

            const currentY = Number(match.y ?? 0);
            const previousY = Number(match.previousY ?? 0);
            const diff = currentY - previousY;
            const diffPercentage = previousY ? (diff / previousY) * 100 : null;

            return {
              id: series.id,
              color: series.color,
              label: series.label,
              currentTime: match.currentTime as DateTime | undefined,
              previousTime: match.previousTime as DateTime | undefined,
              currentY,
              previousY,
              diffPercentage,
              previousColor: previousColorFor(series.id),
            };
          })
          .filter(Boolean);

        if (!rows.length) {
          // Fallback: show first available point to avoid empty tooltip
          const p = normalizedPoints[0];
          const currentY = Number(p.data.yFormatted ?? p.data.y ?? 0);
          const previousY = Number(p.data.previousY ?? 0);
          const diff = currentY - previousY;
          const diffPercentage = previousY ? (diff / previousY) * 100 : null;
          const color = colorMap[String(p.serieId)] ?? "hsl(var(--dataviz))";
          const currentTime = p.data.currentTime as DateTime | undefined;
          const previousTime = p.data.previousTime as DateTime | undefined;

          return (
            <ChartTooltip>
              <div className="px-2 pt-1 text-xs font-semibold text-muted-foreground">Users</div>
              {diffPercentage !== null && (
                <div
                  className="text-base font-medium px-2 pt-1.5 pb-1"
                  style={{
                    color: diffPercentage > 0 ? "hsl(var(--green-400))" : "hsl(var(--red-400))",
                  }}
                >
                  {diffPercentage > 0 ? "+" : ""}
                  {diffPercentage.toFixed(2)}%
                </div>
              )}
              <div className="w-full h-[1px] bg-neutral-100 dark:bg-neutral-750"></div>
              <div className="m-2">
                <div className="flex justify-between text-sm w-48">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: color }} />
                    {currentTime ? formatChartDateTime(currentTime, bucket) : ""}
                  </div>
                  <div>{formatTooltipValue(currentY, selectedStat)}</div>
                </div>
                {previousTime && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 rounded-[3px] bg-neutral-200 dark:bg-neutral-750" />
                      {formatChartDateTime(previousTime, bucket)}
                    </div>
                    <div>{formatTooltipValue(previousY, selectedStat)}</div>
                  </div>
                )}
              </div>
            </ChartTooltip>
          );
        }

        return (
          <ChartTooltip>
            {rows.map((row: any, idx: number) => (
              <div key={row.id} className={idx < rows.length - 1 ? "pb-1.5 mb-1.5" : ""}>
                <div className={`px-2 text-xs font-semibold text-muted-foreground ${idx === 0 ? "pt-2" : "pt-1"}`}>
                  {row.label}
                </div>
                {row.diffPercentage !== null && (
                  <div
                    className="text-base font-medium px-2 pt-1.5 pb-1"
                    style={{
                      color: row.diffPercentage > 0 ? "hsl(var(--green-400))" : "hsl(var(--red-400))",
                    }}
                  >
                    {row.diffPercentage > 0 ? "+" : ""}
                    {row.diffPercentage.toFixed(2)}%
                  </div>
                )}
                {row.diffPercentage !== null && <div className="w-full h-[1px] bg-neutral-100 dark:bg-neutral-750" />}

                <div className="m-2">
                  <div className="flex justify-between text-sm w-48">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: row.color }} />
                      {row.currentTime ? formatChartDateTime(row.currentTime, bucket) : ""}
                    </div>
                    <div>{formatTooltipValue(row.currentY, selectedStat)}</div>
                  </div>
                  {row.previousTime && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: row.previousColor }} />
                        {formatChartDateTime(row.previousTime, bucket)}
                      </div>
                      <div>{formatTooltipValue(row.previousY, selectedStat)}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </ChartTooltip>
        );
      }}
      layers={[
        "grid",
        "markers",
        "axes",
        "areas",
        "crosshair",
        displayDashed ? DashedLine : "lines",
        // "lines",
        "slices",
        "points",
        "mesh",
        "legends",
      ]}
    />
  );
}
