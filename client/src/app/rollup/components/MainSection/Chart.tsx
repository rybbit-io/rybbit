"use client";
import { TimeBucket } from "@rybbit/shared";
import { ResponsiveLine } from "@nivo/line";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Time } from "@/components/DateSelector/types";
import { formatChartDateTime, hour12, userLocale } from "@/lib/dateTimeUtils";
import { useNivoTheme } from "@/lib/nivo";
import { getTimezone } from "@/lib/store";
import { StatType } from "@/lib/store";
import { formatSecondsAsMinutesAndSeconds, formatter } from "@/lib/utils";
import { RollupSeries } from "../../hooks/useRollupBucketed";

const SITE_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 45%)",
  "hsl(24, 95%, 60%)",
  "hsl(280, 70%, 60%)",
  "hsl(190, 95%, 50%)",
  "hsl(340, 82%, 60%)",
  "hsl(48, 96%, 55%)",
  "hsl(160, 64%, 45%)",
  "hsl(0, 84%, 65%)",
  "hsl(258, 90%, 70%)",
  "hsl(80, 60%, 50%)",
  "hsl(210, 60%, 55%)",
  "hsl(12, 88%, 55%)",
  "hsl(170, 70%, 40%)",
  "hsl(300, 70%, 65%)",
  "hsl(60, 85%, 50%)",
  "hsl(230, 80%, 70%)",
  "hsl(110, 55%, 50%)",
  "hsl(35, 90%, 50%)",
  "hsl(320, 65%, 55%)",
  "hsl(180, 80%, 45%)",
  "hsl(265, 60%, 55%)",
  "hsl(95, 70%, 40%)",
  "hsl(15, 70%, 70%)",
  "hsl(200, 85%, 65%)",
  "hsl(135, 50%, 60%)",
  "hsl(355, 70%, 50%)",
  "hsl(245, 75%, 60%)",
  "hsl(70, 80%, 60%)",
  "hsl(290, 80%, 50%)",
];

// Assign colors by position in the canonical site list so that no two sites
// in view ever collide as long as there are at most SITE_COLORS.length sites.
// Hashing by siteId would collide whenever ids share a residue mod 12.
export function buildSiteColorMap(siteIds: number[]): Map<number, string> {
  const map = new Map<number, string>();
  siteIds.forEach((id, i) => {
    map.set(id, SITE_COLORS[i % SITE_COLORS.length]);
  });
  return map;
}

const FALLBACK_COLOR = SITE_COLORS[0];

const Y_TICK_VALUES = 5;

const formatTooltipValue = (value: number, selectedStat: StatType): string => {
  if (selectedStat === "bounce_rate") return `${value.toFixed(1)}%`;
  if (selectedStat === "session_duration")
    return formatSecondsAsMinutesAndSeconds(value);
  return value.toLocaleString();
};

const getMin = (time: Time, _bucket: TimeBucket, timezone: string) => {
  if (time.mode === "past-minutes") {
    return DateTime.now()
      .setZone(timezone)
      .minus({ minutes: time.pastMinutesStart })
      .startOf(time.pastMinutesStart < 360 ? "minute" : "hour")
      .toJSDate();
  }
  if (time.mode === "day")
    return DateTime.fromISO(time.day, { zone: timezone })
      .startOf("day")
      .toJSDate();
  if (time.mode === "week")
    return DateTime.fromISO(time.week, { zone: timezone })
      .startOf("week")
      .toJSDate();
  if (time.mode === "month")
    return DateTime.fromISO(time.month, { zone: timezone })
      .startOf("month")
      .toJSDate();
  if (time.mode === "year")
    return DateTime.fromISO(time.year, { zone: timezone })
      .startOf("year")
      .toJSDate();
  return undefined;
};

const getMax = (time: Time, _bucket: TimeBucket, timezone: string) => {
  if (time.mode === "day")
    return DateTime.fromISO(time.day, { zone: timezone })
      .endOf("day")
      .toJSDate();
  if (time.mode === "week")
    return DateTime.fromISO(time.week, { zone: timezone })
      .endOf("week")
      .toJSDate();
  if (time.mode === "month")
    return DateTime.fromISO(time.month, { zone: timezone })
      .endOf("month")
      .toJSDate();
  if (time.mode === "year")
    return DateTime.fromISO(time.year, { zone: timezone })
      .endOf("year")
      .toJSDate();
  return undefined;
};

type SiteMeta = {
  siteId: number;
  name: string;
  domain: string;
};

export function Chart({
  series,
  siteMetaById,
  siteColorMap,
  selectedStat,
  bucket,
  time,
}: {
  series: RollupSeries[];
  siteMetaById: Map<number, SiteMeta>;
  siteColorMap: Map<number, string>;
  selectedStat: StatType;
  bucket: TimeBucket;
  time: Time;
}) {
  const { width } = useWindowSize();
  const nivoTheme = useNivoTheme();
  const timezone = getTimezone();

  const chartMin = getMin(time, bucket, timezone);
  const chartMax = getMax(time, bucket, timezone);
  const maxTicks = Math.round((width ?? Infinity) / 75);

  const chartData = series.map((s) => {
    const meta = siteMetaById.get(s.siteId);
    return {
      id: meta?.name || meta?.domain || `Site ${s.siteId}`,
      siteId: s.siteId,
      color: siteColorMap.get(s.siteId) ?? FALLBACK_COLOR,
      data: s.data
        .map((point) => {
          const ts = DateTime.fromSQL(point.time, { zone: timezone }).toUTC();
          if (ts > DateTime.now()) return null;
          return {
            x: ts.toFormat("yyyy-MM-dd HH:mm:ss"),
            y: point[selectedStat],
            ts,
          };
        })
        .filter((p): p is { x: string; y: number; ts: DateTime } => p !== null),
    };
  });

  const yMax = Math.max(
    1,
    ...chartData.flatMap((s) => s.data.map((d) => d.y))
  );

  const colors = chartData.map((s) => s.color);

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
        max: chartMax,
        min: chartMin,
      }}
      yScale={{
        type: "linear",
        min: 0,
        stacked: false,
        reverse: false,
        max: yMax,
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
          time.mode === "day" ||
            (time.mode === "past-minutes" && time.pastMinutesStart === 1440)
            ? 24
            : 12
        ),
        format: (value) => {
          const dt = DateTime.fromJSDate(value as Date, { zone: "utc" })
            .setZone(getTimezone())
            .setLocale(userLocale);
          if (time.mode === "past-minutes") {
            if (time.pastMinutesStart < 1440)
              return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
            return dt.toFormat(hour12 ? "ha" : "HH:mm");
          }
          if (time.mode === "day")
            return dt.toFormat(hour12 ? "ha" : "HH:mm");
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
      colors={colors}
      enableArea={false}
      lineWidth={2}
      sliceTooltip={({ slice }) => {
        const points = [...slice.points].sort(
          (a, b) => Number(b.data.yFormatted) - Number(a.data.yFormatted)
        );
        const tsRaw = points[0]?.data?.ts as DateTime | undefined;

        return (
          <ChartTooltip>
            {tsRaw && (
              <div className="text-xs font-medium px-2 pt-1.5 pb-1 text-neutral-400">
                {formatChartDateTime(tsRaw, bucket)}
              </div>
            )}
            <div className="w-full h-px bg-neutral-100 dark:bg-neutral-750" />
            <div className="m-2 flex flex-col gap-1">
              {points.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between text-sm w-56 gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-1 h-3 rounded-[3px] shrink-0"
                      style={{ backgroundColor: p.seriesColor }}
                    />
                    <span className="truncate">{p.seriesId}</span>
                  </div>
                  <div className="shrink-0">
                    {formatTooltipValue(Number(p.data.yFormatted), selectedStat)}
                  </div>
                </div>
              ))}
            </div>
          </ChartTooltip >
        );
      }}
    />
  );
}
