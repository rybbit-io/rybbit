"use client";

import * as d3 from "d3";
import { DateTime } from "luxon";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TimeBucket } from "@rybbit/shared";
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

// Step a Luxon DateTime by one bucket. Wall-clock arithmetic so DST
// transitions don't introduce off-by-an-hour drift in the tick grid.
const stepBucket = (
  dt: DateTime,
  bucket: TimeBucket,
  direction: 1 | -1
): DateTime => {
  const n = direction;
  switch (bucket) {
    case "minute":
      return dt.plus({ minutes: n });
    case "five_minutes":
      return dt.plus({ minutes: 5 * n });
    case "ten_minutes":
      return dt.plus({ minutes: 10 * n });
    case "fifteen_minutes":
      return dt.plus({ minutes: 15 * n });
    case "hour":
      return dt.plus({ hours: n });
    case "day":
      return dt.plus({ days: n });
    case "week":
      return dt.plus({ weeks: n });
    case "month":
      return dt.plus({ months: n });
    case "year":
      return dt.plus({ years: n });
  }
};

const floorToBucket = (dt: DateTime, bucket: TimeBucket): DateTime => {
  switch (bucket) {
    case "minute":
      return dt.startOf("minute");
    case "five_minutes":
      return dt.set({
        minute: Math.floor(dt.minute / 5) * 5,
        second: 0,
        millisecond: 0,
      });
    case "ten_minutes":
      return dt.set({
        minute: Math.floor(dt.minute / 10) * 10,
        second: 0,
        millisecond: 0,
      });
    case "fifteen_minutes":
      return dt.set({
        minute: Math.floor(dt.minute / 15) * 15,
        second: 0,
        millisecond: 0,
      });
    case "hour":
      return dt.startOf("hour");
    case "day":
      return dt.startOf("day");
    case "week":
      return dt.startOf("week");
    case "month":
      return dt.startOf("month");
    case "year":
      return dt.startOf("year");
  }
};

const floorToMinuteInterval = (dt: DateTime, minutes: number): DateTime =>
  dt.set({
    minute: Math.floor(dt.minute / minutes) * minutes,
    second: 0,
    millisecond: 0,
  });

const bucketMinuteInterval = (bucket: TimeBucket): number | null => {
  switch (bucket) {
    case "minute":
      return 1;
    case "five_minutes":
      return 5;
    case "ten_minutes":
      return 10;
    case "fifteen_minutes":
      return 15;
    case "hour":
      return 60;
    default:
      return null;
  }
};

const bucketDurationMinutes = (bucket: TimeBucket): number => {
  switch (bucket) {
    case "minute":
      return 1;
    case "five_minutes":
      return 5;
    case "ten_minutes":
      return 10;
    case "fifteen_minutes":
      return 15;
    case "hour":
      return 60;
    case "day":
      return 24 * 60;
    case "week":
      return 7 * 24 * 60;
    case "month":
      return 31 * 24 * 60;
    case "year":
      return 366 * 24 * 60;
  }
};

const canDragSelectBucket = (bucket: TimeBucket) =>
  bucket === "minute" ||
  bucket === "five_minutes" ||
  bucket === "ten_minutes" ||
  bucket === "fifteen_minutes" ||
  bucket === "hour" ||
  bucket === "day";

const getDragZoomBucket = (
  start: DateTime,
  endExclusive: DateTime,
  sourceBucket: TimeBucket
): TimeBucket | null => {
  let desiredBucket: TimeBucket | null = null;

  if (sourceBucket === "day") {
    const days = Math.round(
      endExclusive.startOf("day").diff(start.startOf("day"), "days").days
    );
    desiredBucket = days <= 3 ? "hour" : null;
  } else {
    const minutes = endExclusive.diff(start, "minutes").minutes;
    if (minutes <= 60) desiredBucket = "minute";
    else if (minutes <= 3 * 24 * 60) desiredBucket = "hour";
  }

  if (!desiredBucket) return null;
  return bucketDurationMinutes(desiredBucket) < bucketDurationMinutes(sourceBucket)
    ? desiredBucket
    : null;
};

const hasDuplicateTickLabels = (
  ticks: Date[],
  formatLabel: (tick: Date) => string
): boolean => {
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
  const initialStride = Math.max(
    1,
    Math.ceil(ticks.length / safeMaxTickCount)
  );

  for (let stride = initialStride; stride <= ticks.length; stride++) {
    const sampled = ticks.filter((_, index) => index % stride === 0);
    if (!hasDuplicateTickLabels(sampled, formatLabel)) {
      return sampled;
    }
  }

  return [ticks[0]];
};

type Point = {
  x: Date;
  y: number;
  currentTime: DateTime;
};

type PrevPoint = {
  x: Date;
  y: number;
  originalTime: DateTime;
};

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
  bucket: TimeBucket,
  pastMinutesStart: number | undefined,
  isExactRange: boolean,
  showMinutePrecision: boolean
) => {
  const dt = DateTime.fromJSDate(date, { zone: "utc" })
    .setZone(getTimezone())
    .setLocale(userLocale);
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
      return (
        b.mode === "week" && a.week === b.week && a.wellKnown === b.wellKnown
      );
    case "month":
      return (
        b.mode === "month" && a.month === b.month && a.wellKnown === b.wellKnown
      );
    case "year":
      return (
        b.mode === "year" && a.year === b.year && a.wellKnown === b.wellKnown
      );
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
  const { time, bucket, selectedStat, previousTime, setTime, setBucket } = useStore();
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
      minutes <= 60
        ? "minute"
        : minutes <= 3 * 24 * 60 && !bucketMinuteInterval(bucket)
          ? "hour"
          : null;

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

  const { current, previous, chartMin, chartMax, displayDashed } = useMemo(() => {
    const { min: cMin, max: boundsMax } = getChartTimeBounds(
      time,
      bucket,
      timezone
    );

    const now = DateTime.now();
    const lowerBoundMs = cMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();

    // Filter against the strict period bounds (not the fallback-extended
    // chartMax) so that during a goBack/goForward transition, stale data
    // from the previous query doesn't get dragged onto the new x-axis.
    const currentPoints: Point[] = [];
    data?.data?.forEach(e => {
      const ts = DateTime.fromSQL(e.time, { zone: timezone }).toUTC();
      if (ts > now) return;
      const tsMs = ts.toMillis();
      if (lowerBoundMs !== undefined && tsMs < lowerBoundMs) return;
      if (tsMs > upperBoundMs) return;
      currentPoints.push({
        x: ts.toJSDate(),
        y: Number(e[selectedStat] ?? 0),
        currentTime: ts,
      });
    });

    // For "all-time" mode (and any mode where the period has no fixed bounds)
    // derive chartMin from the data so the x-axis isn't a dummy [0,1] domain.
    const dataMin = currentPoints.length ? currentPoints[0].x : undefined;
    const dataMax = currentPoints.length
      ? currentPoints[currentPoints.length - 1].x
      : undefined;
    const chartXMaxMs = chartXMax?.getTime();
    const boundedChartXMax =
      chartXMax &&
      chartXMaxMs !== undefined &&
      (lowerBoundMs === undefined || chartXMaxMs >= lowerBoundMs) &&
      chartXMaxMs <= upperBoundMs
        ? chartXMax
        : undefined;
    const effChartMin = cMin ?? dataMin;
    const effChartMax = boundedChartXMax ?? boundsMax ?? dataMax ?? now.toJSDate();

    // Previous points — time-shift onto the current period's x-axis. Each
    // previous timestamp is shifted by (cMin - prevMin), so prev[0] lands at
    // cMin. Keep originalTime so the tooltip can show the real previous date.
    // Filter against the strict bounds so stale previous queries don't bleed
    // onto the new x-axis during goBack/goForward.
    const { min: prevMin } = getChartTimeBounds(previousTime, bucket, timezone);
    const offsetMs =
      cMin && prevMin ? cMin.getTime() - prevMin.getTime() : 0;
    const previousPoints: PrevPoint[] = [];
    previousData?.data?.forEach(e => {
      const prevTs = DateTime.fromSQL(e.time, { zone: timezone }).toUTC();
      const mappedMs = prevTs.toMillis() + offsetMs;
      if (lowerBoundMs !== undefined && mappedMs < lowerBoundMs) return;
      if (mappedMs > upperBoundMs) return;
      previousPoints.push({
        x: new Date(mappedMs),
        y: Number(e[selectedStat] ?? 0),
        originalTime: prevTs,
      });
    });

    const currentDayStr = DateTime.now().toISODate();
    const currentMonthStr = DateTime.now().toFormat("yyyy-MM-01");
    const shouldNotDisplay =
      time.mode === "all-time" ||
      isExactRange ||
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
      chartMin: effChartMin,
      chartMax: effChartMax,
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
    isExactRange,
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
  const xTickCount =
    time.mode === "day" ||
    (time.mode === "past-minutes" && time.pastMinutesStart === 1440)
      ? Math.min(maxTicks, 24)
      : maxTicks;
  const pastMinutesStartForTicks =
    time.mode === "past-minutes" ? time.pastMinutesStart : undefined;
  const minuteTickInterval = useMemo(() => {
    if (!W || !chartMin || !chartMax || xTickCount <= 0) return null;
    if (!isExactRange && time.mode !== "past-minutes") return null;

    const minInterval = bucketMinuteInterval(bucket);
    if (!minInterval) return null;

    const durationMinutes = Math.ceil(
      (chartMax.getTime() - chartMin.getTime()) / 60_000
    );
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
  // buckets are (e.g. weekly Sunday-starts), then walked forward to chartMax
  // and backward to chartMin in user-tz wall-clock steps. This makes ticks
  // appear past today for in-progress periods ("this month" → ticks for
  // May 1-31 even when current data only goes up to today), so the previous
  // line drawn under those positions has labels/gridlines.
  const xTicks = useMemo(() => {
    if (!W || !chartMin || !chartMax || xTickCount <= 0) return [];

    const chartMinMs = chartMin.getTime();
    const chartMaxMs = chartMax.getTime();
    const formatTickLabel = (tick: Date) =>
      formatXTick(
        tick,
        time.mode,
        bucket,
        pastMinutesStartForTicks,
        isExactRange,
        minuteTickInterval !== null
      );

    if (minuteTickInterval) {
      const min = DateTime.fromMillis(chartMinMs, { zone: "utc" }).setZone(
        timezone
      );
      const max = DateTime.fromMillis(chartMaxMs, { zone: "utc" }).setZone(
        timezone
      );
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

    const anchorMs = current.length ? current[0].x.getTime() : chartMinMs;
    const anchor = DateTime.fromMillis(anchorMs, { zone: "utc" }).setZone(
      timezone
    );

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
    current,
    bucket,
    timezone,
    time.mode,
    pastMinutesStartForTicks,
    isExactRange,
  ]);

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
  const bisectCurrent = useMemo(
    () => d3.bisector<Point, Date>(d => d.x).center,
    []
  );
  const bisectPrev = useMemo(
    () => d3.bisector<PrevPoint, Date>(d => d.x).center,
    []
  );
  const [hover, setHover] = useState<{
    point: Point;
    prev?: PrevPoint;
    clientX: number;
    clientY: number;
  } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!current.length) return;
    if (dragRaw) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + plotLeft;
    const xDate = xScale.invert(x);
    const idx = bisectCurrent(current, xDate);
    const point = current[idx];
    if (!point) return;
    // Pair the tooltip's previous value by x-position on the chart — i.e.
    // whatever previous bucket is closest to where the current point sits.
    // This stays consistent with the time-shifted previous line.
    let prev: PrevPoint | undefined;
    if (previous.length) {
      const pIdx = bisectPrev(previous, point.x);
      prev = previous[pIdx];
    }
    setHover({ point, prev, clientX: e.clientX, clientY: e.clientY });
  };

  const handleMouseLeave = () => setHover(null);

  // Drag-to-select range. Day buckets keep using date ranges; sub-day buckets
  // commit an exact half-open datetime range [start, end).
  const dragEnabled = canDragSelectBucket(bucket);
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

  // Snap drag positions the same way hover does: to the nearest visible
  // current bucket, so the committed selection matches the crosshair.
  const pxToBucketStart = useCallback(
    (px: number) => {
      const xDate = xScale.invert(px);
      const point = current[bisectCurrent(current, xDate)];
      if (point) {
        return DateTime.fromJSDate(point.x, { zone: "utc" }).setZone(timezone);
      }
      return floorToBucket(
        DateTime.fromMillis(xDate.getTime(), { zone: "utc" }).setZone(timezone),
        bucket
      );
    },
    [bisectCurrent, bucket, current, timezone, xScale]
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
    if (!dragEnabled || !current.length) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = Math.max(
      plotLeft,
      Math.min(plotRight, e.clientX - rect.left + plotLeft)
    );

    // Track in closure variables so we can read the final position in onUp
    // without going through a setState updater (which runs during render and
    // would warn when setTime touches another component's store subscription).
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
        const nextBucket =
          getDragZoomBucket(startBucket, stepBucket(endBucket, bucket, 1), bucket) ??
          bucket;
        // Pass changeBucket=false so dragging within e.g. an all-time/day
        // view doesn't auto-switch to week/month for shorter ranges.
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
        const nextBucket =
          getDragZoomBucket(startBucket, endExclusive, bucket) ?? bucket;
        commitDragZoom(nextTime, nextBucket);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleDoubleClick = (e: React.MouseEvent<SVGRectElement>) => {
    const dragZoom = dragZoomRestoreRef.current;
    if (!dragZoom) return;
    if (!isSameTime(time, dragZoom.after) || bucket !== dragZoom.afterBucket) return;

    e.preventDefault();
    setHover(null);
    dragZoomRestoreRef.current = null;
    setTime(dragZoom.before, false);
    if (dragZoom.beforeBucket !== bucket) {
      setBucket(dragZoom.beforeBucket);
    }
  };

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
  const hoverPreviousY = hover?.prev?.y ?? 0;
  const hoverDiff = hoverCurrentY - hoverPreviousY;
  const hoverDiffPct =
    hover?.prev && hoverPreviousY
      ? (hoverDiff / hoverPreviousY) * 100
      : null;

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
      {W > 0 && H > 0 && (
        <svg width={W} height={H} style={{ display: "block" }}>
          <defs>
            <linearGradient id={`grad-${clipId}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--dataviz))" stopOpacity={1} />
              <stop offset="100%" stopColor="hsl(var(--dataviz))" stopOpacity={0} />
            </linearGradient>
            <linearGradient
              id={`grad-dashed-${clipId}`}
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
            <clipPath id={`clip-${clipId}`}>
              <rect
                x={plotLeft}
                y={plotTop}
                width={plotW}
                height={plotH}
              />
            </clipPath>
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

          {/* Clipped plot content — keeps lines/areas from spilling out of
              the plot rect when bucket boundaries straddle chartMin/chartMax. */}
          <g clipPath={`url(#clip-${clipId})`}>
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
              <path
                d={currentAreaPath}
                fill={`url(#grad-${clipId})`}
                opacity={0.3}
              />
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
                fill={`url(#grad-dashed-${clipId})`}
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
          </g>

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
                  bucket,
                  time.mode === "past-minutes"
                    ? time.pastMinutesStart
                    : undefined,
                  isExactRange,
                  minuteTickInterval !== null
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

          {/* Drag-to-select range overlay - snapped to bucket boundaries. */}
          {dragSnapped && dragRaw?.moved && (
            <g pointerEvents="none">
              <rect
                x={dragSnapped.leftPx}
                y={plotTop}
                width={Math.max(0, dragSnapped.rightPx - dragSnapped.leftPx)}
                height={plotH}
                fill="hsl(var(--dataviz))"
                opacity={0.18}
              />
              <line
                x1={dragSnapped.leftPx}
                x2={dragSnapped.leftPx}
                y1={plotTop}
                y2={plotBottom}
                stroke="hsl(var(--dataviz))"
                strokeWidth={1}
              />
              <line
                x1={dragSnapped.rightPx}
                x2={dragSnapped.rightPx}
                y1={plotTop}
                y2={plotBottom}
                stroke="hsl(var(--dataviz))"
                strokeWidth={1}
              />
            </g>
          )}

          {/* Mouse capture */}
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
                {hover.prev && (
                  <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1 h-3 rounded-[3px] bg-neutral-200 dark:bg-neutral-750 shrink-0" />
                      <span className="truncate">
                        {formatChartDateTime(hover.prev.originalTime, bucket)}
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
