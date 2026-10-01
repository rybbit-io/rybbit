"use client";

import { ResponsiveLine, SliceTooltipProps } from "@nivo/line";
import { useMeasure } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Delta } from "@/components/site/Delta";
import { formatChartDateTime, hour12, userLocale } from "@/lib/dateTimeUtils";
import { percentDelta } from "@/lib/delta";
import { useNivoTheme } from "@/lib/nivo";
import { getTimezone, useStore } from "@/lib/store";
import { formatter } from "@/lib/utils";

export type SeriesPoint = {
  x: string;
  y: number;
  currentTime: DateTime;
  /** Position of the bucket in the period, to find its counterpart in the comparison period. */
  index: number;
};

export type ChartSeries = {
  id: string;
  color: string;
  data: SeriesPoint[];
};

/** The comparison period's bucket at the same position, summed over the visible series. */
export type ComparisonBucket = {
  time: DateTime;
  total: number;
};

interface EventSeriesChartProps {
  /** The visible series only. */
  series: ChartSeries[];
  /** By bucket position. Leave out when the comparison is off. */
  comparison?: (ComparisonBucket | undefined)[];
  /** Adds a total row to the tooltip. */
  showTotal?: boolean;
}

const SUB_DAY_BUCKETS = ["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour"];

/** The line chart both breakdowns draw: one line per series, a shared tooltip per bucket. */
export function EventSeriesChart({ series, comparison, showTotal = false }: EventSeriesChartProps) {
  const t = useExtracted();
  const bucket = useStore(state => state.bucket);
  // The chart shares its card with the legend, so the ticks follow its own width, not the window's.
  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const nivoTheme = useNivoTheme();
  const timezone = getTimezone();

  const values = series.flatMap(serie => serie.data.map(point => point.y));
  const maxValue = values.length > 0 ? Math.max(...values) : 1;
  const totalPoints = series[0]?.data.length ?? 0;
  const maxTicks = Math.max(2, Math.floor(((width ?? 800) - 60) / 76));

  const formatXAxisValue = (value: Date) => {
    const dt = DateTime.fromJSDate(value, { zone: "utc" }).setZone(timezone).setLocale(userLocale);
    if (SUB_DAY_BUCKETS.includes(bucket)) {
      return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
    }
    return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      <ResponsiveLine
        data={series}
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
          max: Math.max(maxValue, 1),
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
          tickValues: totalPoints > 0 ? Math.min(maxTicks, totalPoints) : undefined,
          format: formatXAxisValue,
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 10,
          tickRotation: 0,
          truncateTickAt: 0,
          tickValues: 5,
          format: formatter,
        }}
        colors={datum => datum.color}
        enableTouchCrosshair={true}
        enablePoints={false}
        useMesh={true}
        animate={false}
        enableSlices="x"
        lineWidth={2}
        sliceTooltip={({ slice }: SliceTooltipProps<ChartSeries>) => {
          const first = slice.points[0]?.data;
          const currentTime = first?.currentTime as DateTime | undefined;
          const sortedPoints = slice.points.toSorted((a, b) => Number(b.data.yFormatted) - Number(a.data.yFormatted));
          const total = sortedPoints.reduce((acc, point) => acc + Number(point.data.yFormatted), 0);
          const previous = first ? comparison?.[first.index as number] : undefined;

          return (
            <ChartTooltip>
              <div className="min-w-[180px] p-3">
                {currentTime && <div className="mb-2 font-medium">{formatChartDateTime(currentTime, bucket)}</div>}
                <div className="space-y-1">
                  {sortedPoints.map(point => (
                    <div key={point.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-1 rounded-[3px]" style={{ backgroundColor: point.seriesColor }} />
                        <span className="max-w-[160px] truncate text-neutral-600 dark:text-neutral-300">
                          {point.seriesId}
                        </span>
                      </div>
                      <span className="font-medium tabular-nums text-neutral-700 dark:text-neutral-200">
                        {Number(point.data.yFormatted).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                {showTotal && (
                  <div className="mt-2 flex justify-between border-t border-neutral-100 pt-2 dark:border-neutral-750">
                    <span className="text-neutral-600 dark:text-neutral-300">{t("Total")}</span>
                    <span className="font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                      {total.toLocaleString()}
                    </span>
                  </div>
                )}
                {showTotal && previous && (
                  <div className="mt-1 flex justify-between gap-4 text-neutral-500 dark:text-neutral-400">
                    <span>{formatChartDateTime(previous.time, bucket)}</span>
                    <span className="flex items-center gap-1.5 tabular-nums">
                      {previous.total.toLocaleString()}
                      <Delta value={percentDelta(total, previous.total)} />
                    </span>
                  </div>
                )}
              </div>
            </ChartTooltip>
          );
        }}
      />
    </div>
  );
}
