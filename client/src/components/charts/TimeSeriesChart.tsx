"use client";

import * as d3 from "d3";
import type { TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import type { Time } from "@/components/DateSelector/types";
import { hour12, userLocale } from "@/lib/dateTimeUtils";
import { getTimezone, useStore } from "@/lib/store";
import { formatter } from "@/lib/utils";

import {
  bucketMinuteInterval,
  canDragSelectBucket,
  floorToBucket,
  floorToMinuteInterval,
  getDragZoomBucket,
  stepBucket,
} from "./timeSeriesChartUtils";

const MARGIN = { top: 10, right: 15, bottom: 30, left: 40 };
const Y_TICKS = 5;

export type TimeSeriesChartPoint = {
  x: Date;
  y: number;
};

export type TimeSeriesChartSeries<Point extends TimeSeriesChartPoint = TimeSeriesChartPoint> = {
  id: string;
  data: Point[];
  color: string;
  strokeWidth?: number;
};

export type TimeSeriesChartMarker = {
  value: number;
  color: string;
  label?: string;
  strokeDasharray?: string;
};

type TimeSeriesTooltipContext<CurrentPoint extends TimeSeriesChartPoint, PreviousPoint extends TimeSeriesChartPoint> = {
  point: CurrentPoint;
  previousPoint?: PreviousPoint;
  points: Array<{
    id: string;
    color: string;
    point: CurrentPoint;
  }>;
  bucket: TimeBucket;
};

type TimeSeriesChartProps<
  CurrentPoint extends TimeSeriesChartPoint,
  PreviousPoint extends TimeSeriesChartPoint = TimeSeriesChartPoint,
> = {
  current: CurrentPoint[];
  previous?: PreviousPoint[];
  max: number;
  chartMin: Date | undefined;
  chartMax: Date | undefined;
  series?: TimeSeriesChartSeries<CurrentPoint>[];
  markers?: TimeSeriesChartMarker[];
  displayDashed?: boolean;
  currentColor?: string;
  currentAreaOpacity?: number;
  dashedStrokeWidth?: number;
  previousColor?: string;
  tooltipWidth?: number;
  yTickFormat?: (value: number) => string;
  /** Disable click-drag range zoom (e.g. for embedded dashboard cards). */
  disableDragZoom?: boolean;
  renderTooltip: (context: TimeSeriesTooltipContext<CurrentPoint, PreviousPoint>) => ReactNode;
};

const hasDuplicateTickLabels = (ticks: Date[], formatLabel: (tick: Date) => string): boolean => {
  const seen = new Set<string>();
  for (const tick of ticks) {
    const label = formatLabel(tick);
    if (seen.has(label)) return true;
    seen.add(label);
  }
  return false;
};

const reduceTicksForUniqueLabels = (
  ticks: Date[],
  maxTickCount: number,
  formatLabel: (tick: Date) => string
): Date[] => {
  if (ticks.length <= 1) return ticks;

  const safeMaxTickCount = Math.max(1, maxTickCount);
  const initialStride = Math.max(1, Math.ceil(ticks.length / safeMaxTickCount));

  for (let stride = initialStride; stride <= ticks.length; stride++) {
    const sampled = ticks.filter((_, index) => index % stride === 0);
    if (!hasDuplicateTickLabels(sampled, formatLabel)) {
      return sampled;
    }
  }

  return [ticks[0]];
};

const formatXTick = (
  date: Date,
  mode: Time["mode"],
  bucket: TimeBucket,
  pastMinutesStart: number | undefined,
  isExactRange: boolean,
  showMinutePrecision: boolean
) => {
  const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(getTimezone()).setLocale(userLocale);
  if (showMinutePrecision) {
    return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
  }
  if (mode === "past-minutes") {
    if ((pastMinutesStart ?? 0) < 1440) {
      return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
    }
    return dt.toFormat(hour12 ? "ha" : "HH:mm");
  }
  if (
    mode === "day" ||
    (isExactRange &&
      (bucket === "minute" ||
        bucket === "five_minutes" ||
        bucket === "ten_minutes" ||
        bucket === "fifteen_minutes" ||
        bucket === "hour"))
  ) {
    return dt.toFormat(hour12 ? "ha" : "HH:mm");
  }
  return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
};

const isSameTime = (a: Time, b: Time): boolean => {
  if (a.mode !== b.mode) return false;

  switch (a.mode) {
    case "day":
      return b.mode === "day" && a.day === b.day && a.wellKnown === b.wellKnown;
    case "range":
      return (
        b.mode === "range" &&
        a.startDate === b.startDate &&
        a.endDate === b.endDate &&
        a.startTime === b.startTime &&
        a.endTime === b.endTime &&
        a.wellKnown === b.wellKnown
      );
    case "week":
      return b.mode === "week" && a.week === b.week && a.wellKnown === b.wellKnown;
    case "month":
      return b.mode === "month" && a.month === b.month && a.wellKnown === b.wellKnown;
    case "year":
      return b.mode === "year" && a.year === b.year && a.wellKnown === b.wellKnown;
    case "all-time":
      return b.mode === "all-time" && a.wellKnown === b.wellKnown;
    case "past-minutes":
      return (
        b.mode === "past-minutes" &&
        a.pastMinutesStart === b.pastMinutesStart &&
        a.pastMinutesEnd === b.pastMinutesEnd &&
        a.wellKnown === b.wellKnown
      );
  }
};

export function TimeSeriesChart<
  CurrentPoint extends TimeSeriesChartPoint,
  PreviousPoint extends TimeSeriesChartPoint = TimeSeriesChartPoint,
>({
  current,
  previous = [],
  max,
  chartMin,
  chartMax,
  series,
  markers = [],
  displayDashed = false,
  currentColor = "hsl(var(--dataviz))",
  currentAreaOpacity = 0.3,
  dashedStrokeWidth = 3,
  previousColor,
  tooltipWidth = 220,
  yTickFormat = formatter,
  disableDragZoom = false,
  renderTooltip,
}: TimeSeriesChartProps<CurrentPoint, PreviousPoint>) {
  const { time, bucket, setTime, setBucket } = useStore();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const timezone = getTimezone();
  const isExactRange = time.mode === "range" && Boolean(time.startTime && time.endTime);
  const clipId = useId().replace(/:/g, "");

  useEffect(() => {
    if (time.mode !== "range" || !time.startTime || !time.endTime) return;

    const start = DateTime.fromISO(`${time.startDate}T${time.startTime}`, {
      zone: timezone,
    });
    const end = DateTime.fromISO(`${time.endDate}T${time.endTime}`, {
      zone: timezone,
    });
    const minutes = end.diff(start, "minutes").minutes;
    if (minutes <= 0) return;

    const nextBucket =
      minutes <= 60 ? "minute" : minutes <= 3 * 24 * 60 && !bucketMinuteInterval(bucket) ? "hour" : null;

    if (nextBucket && nextBucket !== bucket) {
      setBucket(nextBucket);
    }
  }, [bucket, setBucket, time, timezone]);

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

  const W = size.width;
  const H = size.height;
  const plotLeft = MARGIN.left;
  const plotRight = W - MARGIN.right;
  const plotTop = MARGIN.top;
  const plotBottom = H - MARGIN.bottom;
  const plotW = Math.max(0, plotRight - plotLeft);
  const plotH = Math.max(0, plotBottom - plotTop);
  const primarySeries = series?.find(item => item.data.length > 0);
  const primaryData = current.length ? current : (primarySeries?.data ?? []);
  const hoverSeries = series?.length
    ? series
    : [
        {
          id: "Current",
          data: current,
          color: currentColor,
        },
      ];

  const xScale = useMemo(() => {
    if (!W || !chartMin || !chartMax) {
      return d3
        .scaleUtc()
        .domain([new Date(0), new Date(1)])
        .range([plotLeft, plotRight]);
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
  const xTickCount =
    time.mode === "day" || (time.mode === "past-minutes" && time.pastMinutesStart === 1440)
      ? Math.min(maxTicks, 24)
      : maxTicks;
  const pastMinutesStartForTicks = time.mode === "past-minutes" ? time.pastMinutesStart : undefined;
  const minuteTickInterval = useMemo(() => {
    if (!W || !chartMin || !chartMax || xTickCount <= 0) return null;
    if (!isExactRange && time.mode !== "past-minutes") return null;

    const minInterval = bucketMinuteInterval(bucket);
    if (!minInterval) return null;

    const durationMinutes = Math.ceil((chartMax.getTime() - chartMin.getTime()) / 60_000);
    if (durationMinutes <= 0 || durationMinutes > 6 * 60) return null;

    for (const interval of [1, 5, 10, 15, 30, 60]) {
      if (interval < minInterval) continue;
      if (Math.floor(durationMinutes / interval) + 1 <= xTickCount) {
        return interval;
      }
    }

    return durationMinutes <= 2 * 60 && minInterval <= 30 ? 30 : null;
  }, [W, chartMin, chartMax, xTickCount, isExactRange, time.mode, bucket]);

  // Generate ticks spanning [chartMin, chartMax] aligned to bucket boundaries.
  // Anchored on the first current data point so ticks land where the API's
  // buckets are, then walked in user-tz wall-clock steps to avoid DST drift.
  const xTicks = useMemo(() => {
    if (!W || !chartMin || !chartMax || xTickCount <= 0) return [];

    const chartMinMs = chartMin.getTime();
    const chartMaxMs = chartMax.getTime();
    const formatTickLabel = (tick: Date) =>
      formatXTick(tick, time.mode, bucket, pastMinutesStartForTicks, isExactRange, minuteTickInterval !== null);

    if (minuteTickInterval) {
      const min = DateTime.fromMillis(chartMinMs, { zone: "utc" }).setZone(timezone);
      const max = DateTime.fromMillis(chartMaxMs, { zone: "utc" }).setZone(timezone);
      const ticks: Date[] = [];
      let t = floorToMinuteInterval(min, minuteTickInterval);
      if (t.toMillis() < min.toMillis()) {
        t = t.plus({ minutes: minuteTickInterval });
      }

      let safety = 0;
      while (t.toMillis() <= max.toMillis() && safety < 10000) {
        ticks.push(t.toUTC().toJSDate());
        t = t.plus({ minutes: minuteTickInterval });
        safety++;
      }

      return reduceTicksForUniqueLabels(ticks, xTickCount, formatTickLabel);
    }

    const anchorMs = primaryData.length ? primaryData[0].x.getTime() : chartMinMs;
    const anchor = DateTime.fromMillis(anchorMs, { zone: "utc" }).setZone(timezone);

    const ticks: Date[] = [];
    let t = anchor;
    let safety = 0;
    while (t.toMillis() <= chartMaxMs && safety < 10000) {
      if (t.toMillis() >= chartMinMs) {
        ticks.push(t.toUTC().toJSDate());
      }
      t = stepBucket(t, bucket, 1);
      safety++;
    }
    let tb = stepBucket(anchor, bucket, -1);
    safety = 0;
    while (tb.toMillis() >= chartMinMs && safety < 10000) {
      ticks.unshift(tb.toUTC().toJSDate());
      tb = stepBucket(tb, bucket, -1);
      safety++;
    }

    return reduceTicksForUniqueLabels(ticks, xTickCount, formatTickLabel);
  }, [
    W,
    chartMin,
    chartMax,
    xTickCount,
    minuteTickInterval,
    primaryData,
    bucket,
    timezone,
    time.mode,
    pastMinutesStartForTicks,
    isExactRange,
  ]);

  const xGridTicks = useMemo(() => {
    if (xTicks.length <= 8) return xTicks;
    const stride = Math.ceil(xTicks.length / 8);
    return xTicks.filter((_, i) => i % stride === 0);
  }, [xTicks]);

  const yTicks = useMemo(() => yScale.ticks(Y_TICKS), [yScale]);

  const usesCustomSeries = Boolean(series);
  const croppedCurrent = displayDashed ? current.slice(0, -1) : current;
  const dashedSegment =
    !usesCustomSeries && displayDashed && current.length >= 2
      ? [current[current.length - 2], current[current.length - 1]]
      : null;

  const lineGen = useMemo(
    () =>
      d3
        .line<TimeSeriesChartPoint>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y)),
    [xScale, yScale]
  );

  const areaGen = useMemo(
    () =>
      d3
        .area<TimeSeriesChartPoint>()
        .x(d => xScale(d.x))
        .y0(yScale(0))
        .y1(d => yScale(d.y)),
    [xScale, yScale]
  );

  const currentLinePath = !usesCustomSeries && croppedCurrent.length ? (lineGen(croppedCurrent) ?? "") : "";
  const currentAreaPath = !usesCustomSeries && croppedCurrent.length ? (areaGen(croppedCurrent) ?? "") : "";
  const dashedLinePath = dashedSegment && dashedSegment.length === 2 ? (lineGen(dashedSegment) ?? "") : "";
  const dashedAreaPath = dashedSegment && dashedSegment.length === 2 ? (areaGen(dashedSegment) ?? "") : "";
  const previousLinePath = previous.length ? (lineGen(previous) ?? "") : "";
  const seriesLinePaths =
    series
      ?.map(item => ({
        ...item,
        path: item.data.length ? (lineGen(item.data) ?? "") : "",
      }))
      .filter(item => item.path) ?? [];

  const tickColor = isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-500))";
  const gridColor = isDark ? "hsl(var(--neutral-800))" : "hsl(var(--neutral-100))";
  const previousStroke = previousColor ?? (isDark ? "hsl(var(--neutral-700))" : "hsl(var(--neutral-100))");
  const crosshairColor = isDark ? "hsl(var(--neutral-50))" : "hsl(var(--neutral-900))";

  const bisectCurrent = useMemo(() => d3.bisector<CurrentPoint, Date>(d => d.x).center, []);
  const bisectPrev = useMemo(() => d3.bisector<PreviousPoint, Date>(d => d.x).center, []);
  const [hover, setHover] = useState<{
    point: CurrentPoint;
    previousPoint?: PreviousPoint;
    points: Array<{
      id: string;
      color: string;
      point: CurrentPoint;
    }>;
    clientX: number;
    clientY: number;
  } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!primaryData.length) return;
    if (dragRaw) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + plotLeft;
    const xDate = xScale.invert(x);
    const idx = bisectCurrent(primaryData, xDate);
    const point = primaryData[idx];
    if (!point) return;

    const points = hoverSeries.flatMap(item => {
      if (!item.data.length) return [];
      const seriesPoint = item.data[bisectCurrent(item.data, point.x)];
      if (!seriesPoint || seriesPoint.x.getTime() !== point.x.getTime()) {
        return [];
      }
      return seriesPoint
        ? [
            {
              id: item.id,
              color: item.color,
              point: seriesPoint,
            },
          ]
        : [];
    });

    let previousPoint: PreviousPoint | undefined;
    if (previous.length) {
      const pIdx = bisectPrev(previous, point.x);
      previousPoint = previous[pIdx];
    }
    setHover({ point, previousPoint, points, clientX: e.clientX, clientY: e.clientY });
  };

  const handleMouseLeave = () => setHover(null);

  const dragEnabled = !disableDragZoom && canDragSelectBucket(bucket);
  const [dragRaw, setDragRaw] = useState<{
    startX: number;
    currentX: number;
    moved: boolean;
  } | null>(null);
  const dragZoomRestoreRef = useRef<{
    before: Time;
    beforeBucket: TimeBucket;
    after: Time;
    afterBucket: TimeBucket;
  } | null>(null);

  useEffect(() => {
    const dragZoom = dragZoomRestoreRef.current;
    if (!dragZoom) return;
    if (!isSameTime(time, dragZoom.after) || bucket !== dragZoom.afterBucket) {
      dragZoomRestoreRef.current = null;
    }
  }, [bucket, time]);

  const commitDragZoom = (nextTime: Time, nextBucket: TimeBucket) => {
    dragZoomRestoreRef.current = {
      before: time,
      beforeBucket: bucket,
      after: nextTime,
      afterBucket: nextBucket,
    };
    setTime(nextTime, false);
    if (nextBucket !== bucket) {
      setBucket(nextBucket);
    }
  };

  const pxToBucketStart = useCallback(
    (px: number) => {
      const xDate = xScale.invert(px);
      const point = primaryData[bisectCurrent(primaryData, xDate)];
      if (point) {
        return DateTime.fromJSDate(point.x, { zone: "utc" }).setZone(timezone);
      }
      return floorToBucket(DateTime.fromMillis(xDate.getTime(), { zone: "utc" }).setZone(timezone), bucket);
    },
    [bisectCurrent, bucket, primaryData, timezone, xScale]
  );

  const dragSnapped = useMemo(() => {
    if (!dragRaw) return null;
    const leftPx = Math.min(dragRaw.startX, dragRaw.currentX);
    const rightPx = Math.max(dragRaw.startX, dragRaw.currentX);
    const leftBucket = pxToBucketStart(leftPx);
    const rightBucket = pxToBucketStart(rightPx);
    return {
      leftPx: xScale(leftBucket.toUTC().toJSDate()),
      rightPx: xScale(rightBucket.toUTC().toJSDate()),
    };
  }, [dragRaw, pxToBucketStart, xScale]);

  const handleMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
    if (!dragEnabled || !primaryData.length) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = Math.max(plotLeft, Math.min(plotRight, e.clientX - rect.left + plotLeft));

    let currentX = startX;
    let moved = false;

    setDragRaw({ startX, currentX, moved });
    setHover(null);

    const onMove = (ev: MouseEvent) => {
      if (!wrapperRef.current) return;
      const r = wrapperRef.current.getBoundingClientRect();
      const x = Math.max(plotLeft, Math.min(plotRight, ev.clientX - r.left));
      currentX = x;
      if (!moved && Math.abs(x - startX) >= 3) moved = true;
      setDragRaw({ startX, currentX, moved });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDragRaw(null);
      if (!moved) return;
      const leftPx = Math.min(startX, currentX);
      const rightPx = Math.max(startX, currentX);
      const startBucket = pxToBucketStart(leftPx);
      const endBucket = pxToBucketStart(rightPx);

      if (bucket === "day") {
        const startDate = startBucket.toISODate();
        const endDate = endBucket.toISODate();
        if (!startDate || !endDate) return;
        const nextTime: Time = { mode: "range", startDate, endDate };
        const nextBucket = getDragZoomBucket(startBucket, stepBucket(endBucket, bucket, 1), bucket) ?? bucket;
        commitDragZoom(nextTime, nextBucket);
        return;
      }

      const endExclusive = stepBucket(endBucket, bucket, 1);
      const startDate = startBucket.toISODate();
      const endDate = endExclusive.toISODate();
      if (startDate && endDate) {
        const nextTime: Time = {
          mode: "range",
          startDate,
          endDate,
          startTime: startBucket.toFormat("HH:mm:ss"),
          endTime: endExclusive.toFormat("HH:mm:ss"),
        };
        const nextBucket = getDragZoomBucket(startBucket, endExclusive, bucket) ?? bucket;
        commitDragZoom(nextTime, nextBucket);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleDoubleClick = (e: React.MouseEvent<SVGRectElement>) => {
    const dragZoom = dragZoomRestoreRef.current;
    if (!dragZoom) return;
    if (!isSameTime(time, dragZoom.after) || bucket !== dragZoom.afterBucket) {
      return;
    }

    e.preventDefault();
    setHover(null);
    dragZoomRestoreRef.current = null;
    setTime(dragZoom.before, false);
    if (dragZoom.beforeBucket !== bucket) {
      setBucket(dragZoom.beforeBucket);
    }
  };

  const tooltipOffset = 14;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;
  const tooltipLeft = hover ? Math.min(hover.clientX + tooltipOffset, viewportW - tooltipWidth - 8) : 0;
  const tooltipTop = hover ? Math.min(hover.clientY + tooltipOffset, viewportH - 120) : 0;

  const gradientId = `grad-${clipId}`;
  const dashedGradientId = `grad-dashed-${clipId}`;
  const clipPathId = `clip-${clipId}`;

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
      {W > 0 && H > 0 && (
        <svg width={W} height={H} style={{ display: "block" }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={currentColor} stopOpacity={1} />
              <stop offset="100%" stopColor={currentColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={dashedGradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={currentColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={currentColor} stopOpacity={0} />
            </linearGradient>
            <clipPath id={clipPathId}>
              <rect x={plotLeft} y={plotTop} width={plotW} height={plotH} />
            </clipPath>
          </defs>

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

          {markers.map(marker => {
            const y = yScale(marker.value);
            if (y < plotTop || y > plotBottom) return null;
            return (
              <g key={`${marker.value}-${marker.label ?? marker.color}`} pointerEvents="none">
                <line
                  x1={plotLeft}
                  x2={plotRight}
                  y1={y}
                  y2={y}
                  stroke={marker.color}
                  strokeWidth={1}
                  strokeDasharray={marker.strokeDasharray ?? "8 8"}
                />
                {marker.label && (
                  <text
                    x={plotLeft + 6}
                    y={Math.max(plotTop + 11, y - 6)}
                    fill={marker.color}
                    fontSize={11}
                    textAnchor="start"
                  >
                    {marker.label}
                  </text>
                )}
              </g>
            );
          })}

          <g clipPath={`url(#${clipPathId})`}>
            {previousLinePath && <path d={previousLinePath} fill="none" stroke={previousStroke} strokeWidth={2} />}

            {currentAreaPath && <path d={currentAreaPath} fill={`url(#${gradientId})`} opacity={currentAreaOpacity} />}
            {currentLinePath && <path d={currentLinePath} fill="none" stroke={currentColor} strokeWidth={2} />}

            {seriesLinePaths.map(item => (
              <path key={item.id} d={item.path} fill="none" stroke={item.color} strokeWidth={item.strokeWidth ?? 2} />
            ))}

            {dashedAreaPath && (
              <path d={dashedAreaPath} fill={`url(#${dashedGradientId})`} opacity={currentAreaOpacity} />
            )}
            {dashedLinePath && (
              <path
                d={dashedLinePath}
                fill="none"
                stroke={currentColor}
                strokeWidth={dashedStrokeWidth}
                strokeDasharray="3 6"
              />
            )}
          </g>

          <line x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} stroke={gridColor} strokeWidth={1} />
          {xTicks.map((t, i) => (
            <g key={`xt-${i}`} transform={`translate(${xScale(t)}, ${plotBottom})`}>
              <line y2={5} stroke={tickColor} />
              <text y={5 + 10} dy="0.71em" textAnchor="middle" fontSize={11} fill={tickColor}>
                {formatXTick(
                  t,
                  time.mode,
                  bucket,
                  time.mode === "past-minutes" ? time.pastMinutesStart : undefined,
                  isExactRange,
                  minuteTickInterval !== null
                )}
              </text>
            </g>
          ))}

          <line x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} stroke={gridColor} strokeWidth={1} />
          {yTicks.map((t, i) => (
            <g key={`yt-${i}`} transform={`translate(${plotLeft}, ${yScale(t)})`}>
              <line x2={-5} stroke={tickColor} />
              <text x={-5 - 5} dy="0.32em" textAnchor="end" fontSize={11} fill={tickColor}>
                {yTickFormat(t)}
              </text>
            </g>
          ))}

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
          {hover?.points.map(item => (
            <circle
              key={item.id}
              cx={xScale(item.point.x)}
              cy={yScale(item.point.y)}
              r={4}
              fill={item.color}
              stroke={isDark ? "hsl(var(--neutral-900))" : "white"}
              strokeWidth={2}
              pointerEvents="none"
            />
          ))}

          {dragSnapped && dragRaw?.moved && (
            <g pointerEvents="none">
              <rect
                x={dragSnapped.leftPx}
                y={plotTop}
                width={Math.max(0, dragSnapped.rightPx - dragSnapped.leftPx)}
                height={plotH}
                fill={currentColor}
                opacity={0.18}
              />
              <line
                x1={dragSnapped.leftPx}
                x2={dragSnapped.leftPx}
                y1={plotTop}
                y2={plotBottom}
                stroke={currentColor}
                strokeWidth={1}
              />
              <line
                x1={dragSnapped.rightPx}
                x2={dragSnapped.rightPx}
                y1={plotTop}
                y2={plotBottom}
                stroke={currentColor}
                strokeWidth={1}
              />
            </g>
          )}

          {plotW > 0 && plotH > 0 && (
            <rect
              x={plotLeft}
              y={plotTop}
              width={plotW}
              height={plotH}
              fill="transparent"
              style={{ cursor: dragEnabled ? "crosshair" : "default" }}
              onMouseDown={handleMouseDown}
              onDoubleClick={handleDoubleClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          )}
        </svg>
      )}

      {hover &&
        typeof document !== "undefined" &&
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
            {renderTooltip({
              point: hover.point,
              previousPoint: hover.previousPoint,
              points: hover.points,
              bucket,
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
