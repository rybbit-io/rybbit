"use client";

import type { Annotation, TimeBucket } from "@rybbit/shared";
import * as d3 from "d3";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { ChartLegend, ChartLegendItem } from "@/components/site/ChartLegend";
import { Card, CardLoader } from "@/components/ui/card";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatter } from "@/lib/utils";
import { GetPerformanceTimeSeriesResponse } from "../../../../api/analytics/endpoints";
import { useGetPerformanceTimeSeries } from "../../../../api/analytics/hooks/performance/useGetPerformanceTimeSeries";
import { ChartTooltip } from "../../../../components/charts/ChartTooltip";
import { TimeSeriesChart } from "../../../../components/charts/TimeSeriesChart";
import type { TimeSeriesChartPoint, TimeSeriesOverlayContext } from "../../../../components/charts/TimeSeriesChart";
import { bucketsBetween, getChartTimeBounds, shiftBuckets } from "../../../../components/charts/timeSeriesChartUtils";
import { describeComparisonWindow } from "../../../../components/DateSelector/rangeFields";
import { formatChartDateTime } from "../../../../lib/dateTimeUtils";
import { useComparisonEnabled, useStore, useTimezone } from "../../../../lib/store";
import {
  AnnotationHoverCard,
  AnnotationPopoverContent,
} from "../../main/components/MainSection/annotations/AnnotationDetails";
import { AnnotationPins } from "../../main/components/MainSection/annotations/AnnotationPins";
import type { AnnotationCluster } from "../../main/components/MainSection/annotations/annotationUtils";
import { PercentileLevel, PerformanceMetric, usePerformanceStore } from "../performanceStore";
import {
  formatMetric,
  getMetricRating,
  getPerformanceThresholds,
  MetricRating,
  RATING_COLOR,
  RATING_TEXT_CLASS,
} from "../utils/performanceUtils";
import { useVisibleAnnotations } from "../utils/useVisibleAnnotations";
import { RatingMark, useMetricNames, useRatingLabels } from "./shared/RatingMark";

const DATA_COLOR = "hsl(var(--dataviz))";
const RANGE_COLOR = "hsl(var(--dataviz) / 0.35)";
const PREVIOUS_COLOR = "hsl(var(--neutral-500))";
const TOOLTIP_PERCENTILES: PercentileLevel[] = ["p99", "p90", "p75", "p50"];

// TimeSeriesChart never lets its y axis end below 1, which flattens a metric
// measured in hundredths. CLS is plotted in thousandths and printed back in
// its own unit.
const plotScaleOf = (metric: PerformanceMetric) => (metric === "cls" ? 1000 : 1);

type TimeSeriesRow = GetPerformanceTimeSeriesResponse[number];

const isMeasured = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

type VitalPoint = TimeSeriesChartPoint & {
  time: DateTime;
  loads: number;
  /** The metric at every percentile, in its own unit. */
  percentiles: Record<PercentileLevel, number | null>;
};

type RangePoint = { x: Date; low: number; high: number };
type PreviousPoint = TimeSeriesChartPoint & { value: number; originalTime: DateTime };
type LoadsBar = { x: Date; loads: number };

const percentilesOf = (row: TimeSeriesRow, metric: PerformanceMetric): Record<PercentileLevel, number | null> => ({
  p50: row[`${metric}_p50`],
  p75: row[`${metric}_p75`],
  p90: row[`${metric}_p90`],
  p99: row[`${metric}_p99`],
});

type PinTarget = { cluster: AnnotationCluster; rect: DOMRect };

/**
 * Everything the chart adds to a plain line: the rating bands, the p50 to p90
 * range, the previous period, and the loads each bucket rests on. It is drawn
 * through TimeSeriesChart's overlay, so it shares the chart's scales exactly;
 * the zone labels and the loads strip sit just outside the plot, in padding
 * the wrapper reserves for them.
 */
function VitalsOverlay({
  context,
  metric,
  line,
  range,
  previous,
  bars,
  bucket,
  ratingLabels,
  loadsLabel,
}: {
  context: TimeSeriesOverlayContext;
  metric: PerformanceMetric;
  line: VitalPoint[];
  range: RangePoint[];
  previous: PreviousPoint[];
  bars: LoadsBar[];
  bucket: TimeBucket;
  ratingLabels: Record<MetricRating, string>;
  loadsLabel: string;
}) {
  const { xScale, yScale, plotLeft, plotRight, plotTop, plotBottom, isDark } = context;
  const thresholds = getPerformanceThresholds(metric);
  const scale = plotScaleOf(metric);
  const clampY = (value: number) => Math.max(plotTop, Math.min(plotBottom, yScale(value * scale)));
  const goodY = clampY(thresholds.good);
  const poorY = clampY(thresholds.needs_improvement);

  const linePath = d3
    .line<TimeSeriesChartPoint>()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));
  const rangePath = d3
    .area<RangePoint>()
    .x(d => xScale(d.x))
    .y0(d => yScale(d.low))
    .y1(d => yScale(d.high));

  const zones: { rating: MetricRating; y: number }[] = [
    { rating: "good", y: (plotBottom + goodY) / 2 },
    { rating: "needs_improvement", y: (goodY + poorY) / 2 },
    { rating: "poor", y: (poorY + plotTop) / 2 },
  ];

  const axisColor = isDark ? "hsl(var(--neutral-400))" : "hsl(var(--neutral-500))";
  const gridColor = isDark ? "hsl(var(--neutral-800))" : "hsl(var(--neutral-100))";
  // Below the x axis labels.
  const stripTop = plotBottom + 34;
  const stripBottom = stripTop + 32;
  const maxLoads = bars.reduce((largest, bar) => Math.max(largest, bar.loads), 0);
  const bucketWidth = bars.length
    ? xScale(shiftBuckets(DateTime.fromJSDate(bars[0].x), bucket, 1).toJSDate()) - xScale(bars[0].x)
    : 0;
  const barWidth = Math.max(1, Math.min(24, bucketWidth * 0.62));
  // The first bar is centred on the plot's left edge, so its labels start left of it.
  const labelX = plotLeft - barWidth / 2 - 6;

  return (
    <g pointerEvents="none">
      <rect
        x={plotLeft}
        y={poorY}
        width={plotRight - plotLeft}
        height={goodY - poorY}
        fill={RATING_COLOR.needs_improvement}
        opacity={0.05}
      />
      <rect
        x={plotLeft}
        y={plotTop}
        width={plotRight - plotLeft}
        height={poorY - plotTop}
        fill={RATING_COLOR.poor}
        opacity={0.07}
      />
      {zones.map(zone => (
        <text
          key={zone.rating}
          x={plotRight + 10}
          y={zone.y}
          dy="0.35em"
          fontSize={11}
          className={cn("hidden fill-current md:block", RATING_TEXT_CLASS[zone.rating])}
        >
          {ratingLabels[zone.rating]}
        </text>
      ))}

      {range.length > 1 && <path d={rangePath(range) ?? ""} fill={DATA_COLOR} opacity={0.13} />}
      {/* The two limits, above the range so it does not wash them out. */}
      <line
        x1={plotLeft}
        x2={plotRight}
        y1={goodY}
        y2={goodY}
        stroke={RATING_COLOR.good}
        strokeDasharray="6 5"
        opacity={0.75}
      />
      <line
        x1={plotLeft}
        x2={plotRight}
        y1={poorY}
        y2={poorY}
        stroke={RATING_COLOR.poor}
        strokeDasharray="6 5"
        opacity={0.75}
      />
      {previous.length > 0 && (
        <path
          d={linePath(previous) ?? ""}
          fill="none"
          stroke={PREVIOUS_COLOR}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          strokeLinejoin="round"
        />
      )}
      {/* Again, so the measured line stays above the range and the previous period. */}
      <path d={linePath(line) ?? ""} fill="none" stroke={DATA_COLOR} strokeWidth={2} strokeLinejoin="round" />

      {maxLoads > 0 && (
        <g>
          <line x1={plotLeft} x2={plotRight} y1={stripBottom} y2={stripBottom} stroke={gridColor} strokeWidth={1} />
          <text x={labelX} y={stripTop} dy="0.7em" textAnchor="end" fontSize={11} fill={axisColor}>
            {formatter(maxLoads)}
          </text>
          <text x={labelX} y={stripBottom} textAnchor="end" fontSize={11} fill={axisColor}>
            0
          </text>
          {bars.map(bar => {
            const height = Math.max(1, (bar.loads / maxLoads) * (stripBottom - stripTop));
            return (
              <rect
                key={bar.x.getTime()}
                x={xScale(bar.x) - barWidth / 2}
                y={stripBottom - height}
                width={barWidth}
                height={height}
                rx={Math.min(1.5, barWidth / 2)}
                fill={DATA_COLOR}
                opacity={0.4}
              />
            );
          })}
          <text
            x={plotRight + 10}
            y={(stripTop + stripBottom) / 2}
            dy="0.35em"
            fontSize={11}
            fill={axisColor}
            className="hidden md:block"
          >
            {loadsLabel}
          </text>
        </g>
      )}
    </g>
  );
}

export function PerformanceChart() {
  const t = useExtracted();
  const { site, bucket, time, previousTime } = useStore();
  const timezone = useTimezone();
  const comparisonEnabled = useComparisonEnabled();
  const { selectedPerformanceMetric: metric, selectedPercentile: percentile, showAnnotations } = usePerformanceStore();
  const metricNames = useMetricNames();
  const ratingLabels = useRatingLabels();
  const visibleAnnotations = useVisibleAnnotations();
  const annotations: Annotation[] = showAnnotations ? visibleAnnotations : [];

  const { data, isLoading, isFetching } = useGetPerformanceTimeSeries({ site });
  const { data: previousSeries } = useGetPerformanceTimeSeries({ site, periodTime: "previous" });
  // A query that is switched off keeps its last result as a placeholder.
  const previousData = comparisonEnabled ? previousSeries : undefined;

  const [hoveredPin, setHoveredPin] = useState<PinTarget | null>(null);
  const [selectedPin, setSelectedPin] = useState<PinTarget | null>(null);

  // A pin's card anchors to a snapshot of where the pin was on screen.
  useEffect(() => {
    setSelectedPin(null);
    setHoveredPin(null);
  }, [time, bucket, site, metric, percentile, showAnnotations]);

  const thresholds = getPerformanceThresholds(metric);
  const scale = plotScaleOf(metric);

  const { line, range, bars, previous, previousByTime, chartMin, chartMax, max } = useMemo(() => {
    const { min: boundsMin, max: boundsMax } = getChartTimeBounds(time, bucket, timezone);
    const now = DateTime.now();
    const lowerBoundMs = boundsMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();
    // Stale rows from the period just left must not land on the new x axis.
    const inWindow = (ms: number) => (lowerBoundMs === undefined || ms >= lowerBoundMs) && ms <= upperBoundMs;

    const line: VitalPoint[] = [];
    const range: RangePoint[] = [];
    const bars: LoadsBar[] = [];
    data?.forEach(row => {
      const timestamp = DateTime.fromSQL(row.time, { zone: timezone }).toUTC();
      const loads = Number(row.event_count) || 0;
      // A bucket nobody loaded a page in is a gap, not a zero.
      if (timestamp > now || !inWindow(timestamp.toMillis()) || loads <= 0) return;

      const x = timestamp.toJSDate();
      const percentiles = percentilesOf(row, metric);
      bars.push({ x, loads });
      const value = percentiles[percentile];
      if (isMeasured(value)) line.push({ x, y: value * scale, time: timestamp, loads, percentiles });
      if (isMeasured(percentiles.p50) && isMeasured(percentiles.p90)) {
        range.push({ x, low: percentiles.p50 * scale, high: percentiles.p90 * scale });
      }
    });

    // The previous period is moved onto this period's x axis by a whole number
    // of buckets, first bucket onto first bucket, as the Main chart does.
    const previousMin = previousTime ? getChartTimeBounds(previousTime, bucket, timezone).min : undefined;
    const bucketShift =
      boundsMin && previousMin
        ? bucketsBetween(
            DateTime.fromJSDate(previousMin, { zone: timezone }),
            DateTime.fromJSDate(boundsMin, { zone: timezone }),
            bucket
          )
        : 0;
    const previous: PreviousPoint[] = [];
    previousData?.forEach(row => {
      const originalTime = DateTime.fromSQL(row.time, { zone: timezone }).toUTC();
      const value = row[`${metric}_${percentile}`];
      if (!isMeasured(value) || !(Number(row.event_count) > 0)) return;
      const mappedMs = shiftBuckets(originalTime.setZone(timezone), bucket, bucketShift).toMillis();
      if (!inWindow(mappedMs)) return;
      previous.push({ x: new Date(mappedMs), y: value * scale, value, originalTime });
    });

    const highest = [...line.map(p => p.y), ...range.map(p => p.high), ...previous.map(p => p.y)].reduce(
      (largest, y) => Math.max(largest, y),
      0
    );

    return {
      line,
      range,
      bars,
      previous,
      previousByTime: new Map(previous.map(point => [point.x.getTime(), point])),
      chartMin: boundsMin ?? bars[0]?.x,
      chartMax: boundsMax ?? bars[bars.length - 1]?.x ?? now.toJSDate(),
      // Tall enough to show all three rating bands, with room above the data.
      max: Math.max(highest * 1.05, thresholds.needs_improvement * scale * 1.25),
    };
  }, [data, previousData, metric, percentile, scale, thresholds, time, previousTime, bucket, timezone]);

  const interval = (() => {
    switch (bucket) {
      case "minute":
        return t("per minute");
      case "five_minutes":
        return t("per 5 minutes");
      case "ten_minutes":
        return t("per 10 minutes");
      case "fifteen_minutes":
        return t("per 15 minutes");
      case "hour":
        return t("per hour");
      case "day":
        return t("per day");
      case "week":
        return t("per week");
      case "month":
        return t("per month");
      case "year":
        return t("per year");
    }
  })();

  const currentWindow = describeComparisonWindow(time, time, timezone);
  const previousWindow = describeComparisonWindow(previousTime, time, timezone);
  const legend: ChartLegendItem[] = [
    { id: "current", label: currentWindow ? `${percentile}, ${currentWindow}` : percentile, color: DATA_COLOR },
    { id: "range", label: t("p50 to p90"), color: RANGE_COLOR },
  ];
  if (previous.length > 0) {
    legend.push({
      id: "previous",
      label: previousWindow ? `${percentile}, ${previousWindow}` : t("{percentile}, previous period", { percentile }),
      color: PREVIOUS_COLOR,
      dashed: true,
    });
  }

  const hoverLeft =
    hoveredPin && typeof window !== "undefined" ? Math.min(hoveredPin.rect.right + 8, window.innerWidth - 272) : 0;

  return (
    <Card className="overflow-visible">
      {isFetching && <CardLoader />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-4 pb-2">
        <div className="min-w-0">
          <div className="font-semibold leading-none tracking-tight">{metricNames[metric]}</div>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {t("{percentile} {interval}. Good up to {good}, poor over {poor}.", {
              percentile,
              interval,
              good: formatMetric(metric, thresholds.good),
              poor: formatMetric(metric, thresholds.needs_improvement),
            })}{" "}
            {t("Select a metric in the band above.")}
          </p>
        </div>
        {line.length > 0 && <ChartLegend items={legend} className="pt-0.5" />}
      </div>

      <div className="px-2 pb-3 md:px-4">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-md" />
        ) : line.length === 0 ? (
          <div className="flex h-[300px] w-full items-center justify-center">
            <div className="text-center text-neutral-500 dark:text-neutral-400">
              <p className="text-base font-medium">{t("No performance data available")}</p>
              <p className="text-sm">{t("Try adjusting your date range or filters")}</p>
            </div>
          </div>
        ) : (
          // The padding holds what the overlay draws outside the plot: the loads
          // strip below it and, from `md`, the zone labels beside it.
          <div className="pb-11 md:pr-28 [&_svg]:overflow-visible">
            <div className="h-[260px] w-full">
              <TimeSeriesChart
                current={[]}
                series={[{ id: percentile, data: line, color: DATA_COLOR, strokeWidth: 2 }]}
                max={max}
                chartMin={chartMin}
                chartMax={chartMax}
                yTickFormat={value => (value === 0 ? "0" : formatMetric(metric, value / scale))}
                renderOverlay={context => (
                  <>
                    <VitalsOverlay
                      context={context}
                      metric={metric}
                      line={line}
                      range={range}
                      previous={previous}
                      bars={bars}
                      bucket={bucket}
                      ratingLabels={ratingLabels}
                      loadsLabel={t("Loads measured")}
                    />
                    {annotations.length > 0 && (
                      <AnnotationPins
                        context={context}
                        annotations={annotations}
                        bucket={bucket}
                        selectedKey={selectedPin?.cluster.key ?? null}
                        onSelect={(cluster, rect) => {
                          setHoveredPin(null);
                          setSelectedPin({ cluster, rect });
                        }}
                        onHover={(cluster, rect) => setHoveredPin(cluster && rect ? { cluster, rect } : null)}
                      />
                    )}
                  </>
                )}
                renderTooltip={({ point, bucket }) => {
                  const previousPoint = previousByTime.get(point.x.getTime());
                  return (
                    <ChartTooltip>
                      <div className="p-3 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{formatChartDateTime(point.time, bucket)}</span>
                          <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                            {t("{count} loads", { count: point.loads.toLocaleString() })}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {TOOLTIP_PERCENTILES.map(level => {
                            const value = point.percentiles[level];
                            const selected = level === percentile;
                            const inRange = level === "p50" || level === "p90";
                            return (
                              <div key={level} className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{
                                      background: selected ? DATA_COLOR : inRange ? RANGE_COLOR : "transparent",
                                    }}
                                  />
                                  {level}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 tabular-nums",
                                    selected
                                      ? "font-medium text-neutral-900 dark:text-neutral-50"
                                      : "text-neutral-700 dark:text-neutral-200"
                                  )}
                                >
                                  {selected && isMeasured(value) && (
                                    <RatingMark
                                      rating={getMetricRating(metric, value)}
                                      label={ratingLabels[getMetricRating(metric, value)]}
                                    />
                                  )}
                                  {isMeasured(value) ? formatMetric(metric, value) : "—"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {previousPoint && (
                          <div className="mt-2 flex items-center justify-between gap-4 border-t border-neutral-100 pt-2 dark:border-neutral-750">
                            <span className="flex min-w-0 items-center gap-2 text-neutral-600 dark:text-neutral-300">
                              <span
                                className="w-2.5 shrink-0 border-t border-dashed"
                                style={{ borderColor: PREVIOUS_COLOR }}
                              />
                              <span className="truncate">
                                {percentile}, {formatChartDateTime(previousPoint.originalTime, bucket)}
                              </span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1.5 tabular-nums text-neutral-700 dark:text-neutral-200">
                              <RatingMark
                                rating={getMetricRating(metric, previousPoint.value)}
                                label={ratingLabels[getMetricRating(metric, previousPoint.value)]}
                              />
                              {formatMetric(metric, previousPoint.value)}
                            </span>
                          </div>
                        )}
                      </div>
                    </ChartTooltip>
                  );
                }}
              />
            </div>
          </div>
        )}
        {!isLoading && line.length > 0 && (
          <p className="px-2 text-xs text-neutral-500 dark:text-neutral-400 md:hidden">
            {t("The bars under the chart are the loads measured {interval}.", { interval })}
          </p>
        )}
      </div>

      {hoveredPin &&
        !selectedPin &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: hoverLeft,
              top: Math.max(8, hoveredPin.rect.top - 6),
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <AnnotationHoverCard cluster={hoveredPin.cluster} />
          </div>,
          document.body
        )}

      {selectedPin && (
        <Popover open onOpenChange={open => !open && setSelectedPin(null)}>
          <PopoverAnchor virtualRef={{ current: { getBoundingClientRect: () => selectedPin.rect } }} />
          <PopoverContent side="top" align="start" className="w-80 p-0">
            {/* Read-only here: annotations are written and edited on the Main chart. */}
            <AnnotationPopoverContent
              cluster={selectedPin.cluster}
              canManage={() => false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </PopoverContent>
        </Popover>
      )}
    </Card>
  );
}
