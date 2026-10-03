"use client";

import { type BarCustomLayerProps, ResponsiveBar } from "@nivo/bar";
import { TimeBucket } from "@rybbit/shared";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChartTooltip } from "../../../../components/charts/ChartTooltip";
import { Time } from "../../../../components/DateSelector/types";
import { formatChartDateTime, hour12, userLocale } from "../../../../lib/dateTimeUtils";
import { useNivoTheme } from "../../../../lib/nivo";
import { useTimezone } from "../../../../lib/store";
import { formatter } from "../../../../lib/utils";
import { bucketInstant } from "../botsData";

export interface StackedSeries {
  id: string;
  label: string;
  color: string;
}

export interface StackedRow {
  /** The server's bucket label, in the site's timezone. */
  time: string;
  values: Record<string, number>;
}

type Datum = Record<string, string | number>;

const MARGIN = { top: 10, right: 12, left: 40 };
export const PREVIOUS_COLOR = "hsl(var(--neutral-400))";

const formatTick = (instant: DateTime, bucket: TimeBucket, time: Time) => {
  const local = instant.setLocale(userLocale);
  if (bucket === "month" || bucket === "year") return local.toFormat("MMM yyyy");
  if (bucket === "day" || bucket === "week") return local.toFormat(hour12 ? "MMM d" : "d MMM");
  if (time.mode === "past-minutes") {
    return local.toFormat(time.pastMinutesStart < 1440 ? (hour12 ? "h:mm" : "HH:mm") : hour12 ? "ha" : "HH:mm");
  }
  if (time.mode === "day") return local.toFormat(hour12 ? "ha" : "HH:mm");
  return local.toFormat(hour12 ? "MMM d" : "d MMM");
};

/**
 * Stacked bars per time bucket, with the comparison period's total drawn over
 * them as a dashed line. The comparison is aligned by position: its first
 * bucket sits over this period's first.
 */
export function BotStackedChart({
  rows,
  series,
  previous,
  previousLabel,
  totalLabel,
  bucket,
  time,
  height,
  showXAxis = true,
  yTicks = 4,
  ariaLabel,
}: {
  rows: StackedRow[];
  series: StackedSeries[];
  /** The comparison period's total per bucket, by position. */
  previous?: (number | undefined)[];
  previousLabel?: string;
  /** Names the tooltip's sum line when there is more than one series. */
  totalLabel?: string;
  bucket: TimeBucket;
  time: Time;
  height: number;
  showXAxis?: boolean;
  yTicks?: number;
  ariaLabel: string;
}) {
  const nivoTheme = useNivoTheme();
  const timezone = useTimezone();
  const { width } = useWindowSize();
  const [hover, setHover] = useState<{ time: string; x: number; y: number } | null>(null);

  const keys = useMemo(() => series.map(item => item.id), [series]);
  const colors = useMemo(() => series.map(item => item.color), [series]);
  const data = useMemo<Datum[]>(() => rows.map(row => ({ time: row.time, ...row.values })), [rows]);

  const maxValue = useMemo(() => {
    const stackMax = rows.reduce(
      (largest, row) =>
        Math.max(
          largest,
          Object.values(row.values).reduce((total, value) => total + value, 0)
        ),
      0
    );
    const previousMax = (previous ?? [])
      .slice(0, rows.length)
      .reduce<number>((largest, value) => Math.max(largest, value ?? 0), 0);
    return Math.max(stackMax, previousMax);
  }, [rows, previous]);

  // Roughly one label per 90px of chart. From md up the sidebar takes part of the window.
  const windowWidth = width ?? 1280;
  const maxTicks = Math.max(3, Math.floor((windowWidth - (windowWidth >= 768 ? 320 : 60)) / 90));
  const tickStep = Math.max(1, Math.ceil(rows.length / maxTicks));

  const bars = useMemo(() => {
    const PreviousLine = ({ xScale, yScale }: BarCustomLayerProps<Datum>) => {
      if (!previous?.length) return null;
      // A band scale: a position per bucket and a shared width.
      const band = xScale as unknown as { (value: string): number | undefined; bandwidth: () => number };
      const points = rows.flatMap((row, index) => {
        const value = previous[index];
        const x = band(row.time);
        return value === undefined || x === undefined ? [] : [`${x + band.bandwidth() / 2},${yScale(value)}`];
      });
      if (points.length < 2) return null;
      return (
        <path
          d={`M${points.join("L")}`}
          fill="none"
          stroke={PREVIOUS_COLOR}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      );
    };

    return (
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy="time"
        groupMode="stacked"
        theme={nivoTheme}
        margin={{ ...MARGIN, bottom: showXAxis ? 26 : 6 }}
        padding={0.3}
        valueScale={{ type: "linear", min: 0, max: maxValue > 0 ? maxValue : 1, nice: true }}
        indexScale={{ type: "band", round: false }}
        colors={colors}
        enableGridX={false}
        enableGridY={true}
        gridYValues={yTicks}
        enableLabel={false}
        borderRadius={1}
        animate={false}
        axisTop={null}
        axisRight={null}
        axisBottom={
          showXAxis
            ? {
                tickSize: 0,
                tickPadding: 8,
                format: (value: string) => {
                  const index = rows.findIndex(row => row.time === value);
                  if (index === -1 || index % tickStep !== 0) return "";
                  return formatTick(bucketInstant(value, timezone), bucket, time);
                },
              }
            : null
        }
        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: yTicks, format: formatter }}
        layers={["grid", "axes", "bars", PreviousLine]}
        onMouseEnter={(datum, event) =>
          setHover({ time: String(datum.indexValue), x: event.clientX, y: event.clientY })
        }
        onMouseLeave={() => setHover(null)}
        tooltip={() => <></>}
        role="img"
        ariaLabel={ariaLabel}
      />
    );
  }, [
    data,
    keys,
    colors,
    nivoTheme,
    showXAxis,
    maxValue,
    yTicks,
    rows,
    tickStep,
    timezone,
    bucket,
    time,
    previous,
    ariaLabel,
  ]);

  const hoverIndex = hover ? rows.findIndex(row => row.time === hover.time) : -1;
  const hoverRow = hoverIndex === -1 ? undefined : rows[hoverIndex];
  const hoverPrevious = hoverIndex === -1 ? undefined : previous?.[hoverIndex];
  const hoverTotal = hoverRow ? Object.values(hoverRow.values).reduce((total, value) => total + value, 0) : 0;

  const tooltipWidth = 230;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const tooltipLeft = hover ? Math.max(8, Math.min(hover.x + 14, viewportWidth - tooltipWidth - 8)) : 0;

  return (
    <>
      <div
        className="w-full"
        style={{ height }}
        onMouseMove={event =>
          setHover(current => (current ? { ...current, x: event.clientX, y: event.clientY } : current))
        }
        onMouseLeave={() => setHover(null)}
      >
        {bars}
      </div>
      {hover &&
        hoverRow &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tooltipLeft,
              top: hover.y + 14,
              width: tooltipWidth,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <ChartTooltip>
              <div className="px-2 pb-1 pt-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {formatChartDateTime(bucketInstant(hoverRow.time, timezone), bucket)}
              </div>
              <div className="h-px w-full bg-neutral-100 dark:bg-neutral-750" />
              <div className="m-2 flex flex-col gap-1">
                {series.map(item => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-3 w-1 shrink-0 rounded-[3px]" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="shrink-0 tabular-nums">{(hoverRow.values[item.id] ?? 0).toLocaleString()}</div>
                  </div>
                ))}
                {((series.length > 1 && totalLabel) || (hoverPrevious !== undefined && previousLabel)) && (
                  <div className="mt-1 flex flex-col gap-1 border-t border-neutral-100 pt-1.5 text-sm dark:border-neutral-750">
                    {series.length > 1 && totalLabel && (
                      <div className="flex justify-between gap-3 font-medium">
                        <span>{totalLabel}</span>
                        <span className="tabular-nums">{hoverTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {hoverPrevious !== undefined && previousLabel && (
                      <div className="flex justify-between gap-3 text-neutral-500 dark:text-neutral-400">
                        <span className="truncate">{previousLabel}</span>
                        <span className="shrink-0 tabular-nums">{hoverPrevious.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ChartTooltip>
          </div>,
          document.body
        )}
    </>
  );
}
