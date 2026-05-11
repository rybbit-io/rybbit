"use client";

import * as d3 from "d3";
import { DateTime } from "luxon";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ChartTooltip } from "../../../../../components/charts/ChartTooltip";
import { Time } from "../../../../../components/DateSelector/types";
import {
  formatChartDateTime,
  hour12,
  userLocale,
} from "../../../../../lib/dateTimeUtils";
import { getTimezone, StatType, useStore } from "../../../../../lib/store";
import {
  formatSecondsAsMinutesAndSeconds,
  formatter,
} from "../../../../../lib/utils";
import { GetOverviewBucketedResponse } from "../../../../../api/analytics/endpoints";
import { APIResponse } from "../../../../../api/types";
import { getChartTimeBounds } from "./chartTimeBounds";

type Point = {
  x: Date;
  y: number;
  currentTime: DateTime;
  previousTime?: DateTime;
  previousY?: number;
};

type PrevPoint = { x: Date; y: number };

const MARGIN = { top: 10, right: 15, bottom: 30, left: 40 };
const Y_TICKS = 5;

const formatTooltipValue = (value: number, selectedStat: StatType): string => {
  if (selectedStat === "bounce_rate") return `${value.toFixed(1)}%`;
  if (selectedStat === "session_duration")
    return formatSecondsAsMinutesAndSeconds(value);
  return value.toLocaleString();
};

const formatXTick = (
  date: Date,
  mode: Time["mode"],
  pastMinutesStart: number | undefined
) => {
  const dt = DateTime.fromJSDate(date, { zone: "utc" })
    .setZone(getTimezone())
    .setLocale(userLocale);
  if (mode === "past-minutes") {
    if ((pastMinutesStart ?? 0) < 1440) {
      return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
    }
    return dt.toFormat(hour12 ? "ha" : "HH:mm");
  }
  if (mode === "day") {
    return dt.toFormat(hour12 ? "ha" : "HH:mm");
  }
  return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
};

export function Chart({
  data,
  previousData,
  max,
  chartXMax,
}: {
  data: APIResponse<GetOverviewBucketedResponse> | undefined;
  previousData: APIResponse<GetOverviewBucketedResponse> | undefined;
  max: number;
  chartXMax: Date | undefined;
}) {
  const { time, bucket, selectedStat, previousTime } = useStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const timezone = getTimezone();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { current, previous, chartMin, chartMax, displayDashed } = useMemo(() => {
    const { min: cMin, max: boundsMax } = getChartTimeBounds(
      time,
      bucket,
      timezone
    );

    const now = DateTime.now();

    // Filter against the strict period bounds (not the fallback-extended
    // chartMax) so that during a goBack/goForward transition, stale data
    // from the previous query doesn't get dragged onto the new x-axis.
    const lowerBoundMs = cMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();

    const currentPoints: Point[] = [];
    data?.data?.forEach((e, i) => {
      const ts = DateTime.fromSQL(e.time, { zone: timezone }).toUTC();
      if (ts > now) return;
      const tsMs = ts.toMillis();
      if (lowerBoundMs !== undefined && tsMs < lowerBoundMs) return;
      if (tsMs > upperBoundMs) return;
      const prev = previousData?.data?.[i];
      const prevTs = prev
        ? DateTime.fromSQL(prev.time, { zone: timezone }).toUTC()
        : undefined;
      currentPoints.push({
        x: ts.toJSDate(),
        y: Number(e[selectedStat] ?? 0),
        currentTime: ts,
        previousTime: prevTs,
        previousY: prev ? Number(prev[selectedStat] ?? 0) : undefined,
      });
    });

    // Fall back to the last current data point (or now) when no period max
    // is available — e.g. past-minutes mode with minute/five-minute buckets,
    // where getChartTimeBounds returns max: undefined.
    const fallbackMax = currentPoints.length
      ? currentPoints[currentPoints.length - 1].x
      : now.toJSDate();
    const cMax = chartXMax ?? boundsMax ?? fallbackMax;

    // Shift previous timestamps onto the current period's x-axis. Filter
    // against the strict bounds (same as current points) so a stale previous
    // query doesn't bleed onto the new x-axis during goBack/goForward.
    const { min: prevMin } = getChartTimeBounds(previousTime, bucket, timezone);
    const offsetMs =
      cMin && prevMin ? cMin.getTime() - prevMin.getTime() : 0;
    const previousPoints: PrevPoint[] = [];
    previousData?.data?.forEach(e => {
      const prevTs = DateTime.fromSQL(e.time, { zone: timezone });
      const mappedMs = prevTs.toMillis() + offsetMs;
      if (lowerBoundMs !== undefined && mappedMs < lowerBoundMs) return;
      if (mappedMs > upperBoundMs) return;
      previousPoints.push({
        x: new Date(mappedMs),
        y: Number(e[selectedStat] ?? 0),
      });
    });

    const currentDayStr = DateTime.now().toISODate();
    const currentMonthStr = DateTime.now().toFormat("yyyy-MM-01");
    const shouldNotDisplay =
      time.mode === "all-time" ||
      time.mode === "year" ||
      (time.mode === "month" && time.month !== currentMonthStr) ||
      (time.mode === "day" && time.day !== currentDayStr) ||
      (time.mode === "range" && time.endDate !== currentDayStr) ||
      (time.mode === "day" &&
        (bucket === "minute" || bucket === "five_minutes")) ||
      (time.mode === "past-minutes" &&
        (bucket === "minute" || bucket === "five_minutes"));
    const dashed = currentPoints.length >= 2 && !shouldNotDisplay;

    return {
      current: currentPoints,
      previous: previousPoints,
      chartMin: cMin,
      chartMax: cMax,
      displayDashed: dashed,
    };
  }, [
    data,
    previousData,
    selectedStat,
    time,
    previousTime,
    bucket,
    timezone,
    chartXMax,
  ]);

  const W = size.width;
  const H = size.height;
  const plotLeft = MARGIN.left;
  const plotRight = W - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = H - MARGIN.bottom;
  const plotW = Math.max(0, plotRight - plotLeft);
  const plotH = Math.max(0, plotBottom - plotTop);

  const xScale = useMemo(() => {
    if (!W || !chartMin || !chartMax) {
      return d3.scaleUtc().domain([new Date(0), new Date(1)]).range([plotLeft, plotRight]);
    }
    return d3.scaleUtc().domain([chartMin, chartMax]).range([plotLeft, plotRight]);
  }, [W, chartMin, chartMax, plotLeft, plotRight]);

  const yScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([0, Math.max(max, 1)])
      .range([plotBottom, plotTop]);
  }, [max, plotBottom, plotTop]);

  const maxTicks = Math.max(1, Math.round(W / 40));
  const xTickCount = Math.min(
    maxTicks,
    time.mode === "day" ||
      (time.mode === "past-minutes" && time.pastMinutesStart === 1440)
      ? 24
      : Math.max(1, data?.data?.length ?? 0)
  );

  // Use actual data-point timestamps as ticks so labels line up with the
  // line's vertices. d3.scaleUtc.ticks() snaps to UTC interval boundaries,
  // which drift from the user-timezone bucket boundaries the data points
  // actually sit on.
  const xTicks = useMemo(() => {
    if (!W || !chartMin || !chartMax || xTickCount <= 0) return [];
    if (current.length === 0) return xScale.ticks(xTickCount);
    const stride = Math.max(1, Math.ceil(current.length / xTickCount));
    const ticks: Date[] = [];
    for (let i = 0; i < current.length; i += stride) {
      ticks.push(current[i].x);
    }
    return ticks;
  }, [xScale, xTickCount, W, chartMin, chartMax, current]);

  // Cap vertical gridlines at 8 so dense ranges don't get noisy. Subsample
  // from xTicks so every gridline still aligns with a real label.
  const xGridTicks = useMemo(() => {
    if (xTicks.length <= 8) return xTicks;
    const stride = Math.ceil(xTicks.length / 8);
    return xTicks.filter((_, i) => i % stride === 0);
  }, [xTicks]);

  const yTicks = useMemo(() => yScale.ticks(Y_TICKS), [yScale]);

  const croppedCurrent = displayDashed ? current.slice(0, -1) : current;
  const dashedSegment =
    displayDashed && current.length >= 2
      ? [current[current.length - 2], current[current.length - 1]]
      : null;

  const lineGen = useMemo(
    () =>
      d3
        .line<{ x: Date; y: number }>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y)),
    [xScale, yScale]
  );

  const areaGen = useMemo(
    () =>
      d3
        .area<{ x: Date; y: number }>()
        .x(d => xScale(d.x))
        .y0(yScale(0))
        .y1(d => yScale(d.y)),
    [xScale, yScale]
  );

  const currentLinePath = croppedCurrent.length
    ? lineGen(croppedCurrent) ?? ""
    : "";
  const currentAreaPath = croppedCurrent.length
    ? areaGen(croppedCurrent) ?? ""
    : "";
  const dashedLinePath =
    dashedSegment && dashedSegment.length === 2
      ? lineGen(dashedSegment) ?? ""
      : "";
  const dashedAreaPath =
    dashedSegment && dashedSegment.length === 2
      ? areaGen(dashedSegment) ?? ""
      : "";
  const previousLinePath = previous.length ? lineGen(previous) ?? "" : "";

  const tickColor = isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-500))";
  const gridColor = isDark ? "hsl(var(--neutral-800))" : "hsl(var(--neutral-100))";
  const previousStroke = isDark
    ? "hsl(var(--neutral-700))"
    : "hsl(var(--neutral-100))";
  const crosshairColor = isDark
    ? "hsl(var(--neutral-50))"
    : "hsl(var(--neutral-900))";

  // Hover state
  const bisect = useMemo(
    () => d3.bisector<Point, Date>(d => d.x).center,
    []
  );
  const [hover, setHover] = useState<{
    point: Point;
    clientX: number;
    clientY: number;
  } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!current.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + plotLeft;
    const xDate = xScale.invert(x);
    const idx = bisect(current, xDate);
    const point = current[idx];
    if (!point) return;
    setHover({ point, clientX: e.clientX, clientY: e.clientY });
  };

  const handleMouseLeave = () => setHover(null);

  const tooltipWidth = 220;
  const tooltipOffset = 14;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;
  const tooltipLeft = hover
    ? Math.min(hover.clientX + tooltipOffset, viewportW - tooltipWidth - 8)
    : 0;
  const tooltipTop = hover
    ? Math.min(hover.clientY + tooltipOffset, viewportH - 120)
    : 0;

  const hoverCurrentY = hover?.point.y ?? 0;
  const hoverPreviousY = hover?.point.previousY ?? 0;
  const hoverDiff = hoverCurrentY - hoverPreviousY;
  const hoverDiffPct =
    hover && hover.point.previousY !== undefined && hoverPreviousY
      ? (hoverDiff / hoverPreviousY) * 100
      : null;

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
      {W > 0 && H > 0 && (
        <svg width={W} height={H} style={{ display: "block" }}>
          <defs>
            <linearGradient id="current-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--dataviz))" stopOpacity={1} />
              <stop offset="100%" stopColor="hsl(var(--dataviz))" stopOpacity={0} />
            </linearGradient>
            <linearGradient
              id="current-grad-dashed"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="hsl(var(--dataviz))"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--dataviz))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          {/* Y grid */}
          {yTicks.map((t, i) => (
            <line
              key={`yg-${i}`}
              x1={plotLeft}
              x2={plotRight}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}
          {/* X grid */}
          {xGridTicks.map((t, i) => (
            <line
              key={`xg-${i}`}
              x1={xScale(t)}
              x2={xScale(t)}
              y1={plotTop}
              y2={plotBottom}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}

          {/* Previous line */}
          {previousLinePath && (
            <path
              d={previousLinePath}
              fill="none"
              stroke={previousStroke}
              strokeWidth={2}
            />
          )}

          {/* Current area + line */}
          {currentAreaPath && (
            <path d={currentAreaPath} fill="url(#current-grad)" opacity={0.3} />
          )}
          {currentLinePath && (
            <path
              d={currentLinePath}
              fill="none"
              stroke="hsl(var(--dataviz))"
              strokeWidth={2}
            />
          )}

          {/* Dashed trailing segment */}
          {dashedAreaPath && (
            <path
              d={dashedAreaPath}
              fill="url(#current-grad-dashed)"
              opacity={0.3}
            />
          )}
          {dashedLinePath && (
            <path
              d={dashedLinePath}
              fill="none"
              stroke="hsl(var(--dataviz))"
              strokeWidth={3}
              strokeDasharray="3 6"
            />
          )}

          {/* X axis */}
          <line
            x1={plotLeft}
            x2={plotRight}
            y1={plotBottom}
            y2={plotBottom}
            stroke={gridColor}
            strokeWidth={1}
          />
          {xTicks.map((t, i) => (
            <g key={`xt-${i}`} transform={`translate(${xScale(t)}, ${plotBottom})`}>
              <line y2={5} stroke={tickColor} />
              <text
                y={5 + 10}
                dy="0.71em"
                textAnchor="middle"
                fontSize={11}
                fill={tickColor}
              >
                {formatXTick(
                  t,
                  time.mode,
                  time.mode === "past-minutes" ? time.pastMinutesStart : undefined
                )}
              </text>
            </g>
          ))}

          {/* Y axis */}
          <line
            x1={plotLeft}
            x2={plotLeft}
            y1={plotTop}
            y2={plotBottom}
            stroke={gridColor}
            strokeWidth={1}
          />
          {yTicks.map((t, i) => (
            <g key={`yt-${i}`} transform={`translate(${plotLeft}, ${yScale(t)})`}>
              <line x2={-5} stroke={tickColor} />
              <text
                x={-5 - 5}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill={tickColor}
              >
                {formatter(t)}
              </text>
            </g>
          ))}

          {/* Hover crosshair */}
          {hover && (
            <line
              x1={xScale(hover.point.x)}
              x2={xScale(hover.point.x)}
              y1={plotTop}
              y2={plotBottom}
              stroke={crosshairColor}
              strokeWidth={1}
              opacity={0.4}
              pointerEvents="none"
            />
          )}
          {hover && (
            <circle
              cx={xScale(hover.point.x)}
              cy={yScale(hover.point.y)}
              r={4}
              fill="hsl(var(--dataviz))"
              stroke={isDark ? "hsl(var(--neutral-900))" : "white"}
              strokeWidth={2}
              pointerEvents="none"
            />
          )}

          {/* Mouse capture */}
          {plotW > 0 && plotH > 0 && (
            <rect
              x={plotLeft}
              y={plotTop}
              width={plotW}
              height={plotH}
              fill="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          )}
        </svg>
      )}

      {hover && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tooltipLeft,
              top: tooltipTop,
              width: tooltipWidth,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <ChartTooltip>
              {hoverDiffPct !== null && (
                <div
                  className="text-base font-medium px-2 pt-1.5 pb-1"
                  style={{
                    color:
                      hoverDiffPct > 0
                        ? "hsl(var(--green-400))"
                        : "hsl(var(--red-400))",
                  }}
                >
                  {hoverDiffPct > 0 ? "+" : ""}
                  {hoverDiffPct.toFixed(2)}%
                </div>
              )}
              <div className="w-full h-px bg-neutral-100 dark:bg-neutral-750" />
              <div className="m-2 flex flex-col gap-1">
                <div className="flex justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1 h-3 rounded-[3px] bg-dataviz shrink-0" />
                    <span className="truncate">
                      {formatChartDateTime(hover.point.currentTime, bucket)}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {formatTooltipValue(hoverCurrentY, selectedStat)}
                  </div>
                </div>
                {hover.point.previousTime && (
                  <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1 h-3 rounded-[3px] bg-neutral-200 dark:bg-neutral-750 shrink-0" />
                      <span className="truncate">
                        {formatChartDateTime(hover.point.previousTime, bucket)}
                      </span>
                    </div>
                    <div className="shrink-0">
                      {formatTooltipValue(hoverPreviousY, selectedStat)}
                    </div>
                  </div>
                )}
              </div>
            </ChartTooltip>
          </div>,
          document.body
        )}
    </div>
  );
}
