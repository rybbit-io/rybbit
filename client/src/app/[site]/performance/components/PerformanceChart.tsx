"use client";

import type { Annotation } from "@rybbit/shared";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Card, CardLoader } from "@/components/ui/card";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPerformanceTimeSeries } from "../../../../api/analytics/hooks/performance/useGetPerformanceTimeSeries";
import { ChartTooltip } from "../../../../components/charts/ChartTooltip";
import { TimeSeriesChart } from "../../../../components/charts/TimeSeriesChart";
import type {
  TimeSeriesChartMarker,
  TimeSeriesChartPoint,
  TimeSeriesChartSeries,
} from "../../../../components/charts/TimeSeriesChart";
import { getChartTimeBounds } from "../../../../components/charts/timeSeriesChartUtils";
import { ToggleChip } from "../../../../components/ToggleChip";
import { formatChartDateTime } from "../../../../lib/dateTimeUtils";
import { useStore, useTimezone } from "../../../../lib/store";
import {
  AnnotationHoverCard,
  AnnotationPopoverContent,
} from "../../main/components/MainSection/annotations/AnnotationDetails";
import { AnnotationPins } from "../../main/components/MainSection/annotations/AnnotationPins";
import type { AnnotationCluster } from "../../main/components/MainSection/annotations/annotationUtils";
import { PercentileLevel, PerformanceMetric, usePerformanceStore } from "../performanceStore";
import { formatMetric, getMetricRating, getPerformanceThresholds, RATING_COLOR } from "../utils/performanceUtils";
import { useVisibleAnnotations } from "../utils/useVisibleAnnotations";
import { RatingMark, useMetricNames, useRatingLabels } from "./shared/RatingMark";

const PERCENTILES: PercentileLevel[] = ["p50", "p75", "p90", "p99"];

// One hue, deeper for the slower percentiles, so the lines read in order. The
// light ramp starts a step darker to keep p50 visible on white.
const PERCENTILE_COLORS: Record<"light" | "dark", Record<PercentileLevel, string>> = {
  dark: {
    p50: "hsl(var(--indigo-200))",
    p75: "hsl(var(--indigo-300))",
    p90: "hsl(var(--indigo-400))",
    p99: "hsl(var(--indigo-500))",
  },
  light: {
    p50: "hsl(var(--indigo-300))",
    p75: "hsl(var(--indigo-400))",
    p90: "hsl(var(--indigo-500))",
    p99: "hsl(var(--indigo-700))",
  },
};

// TimeSeriesChart never lets its y axis end below 1, which flattens a metric
// measured in hundredths. CLS is plotted in thousandths and printed back in
// its own unit.
const plotScaleOf = (metric: PerformanceMetric) => (metric === "cls" ? 1000 : 1);

const isMeasured = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

type VitalPoint = TimeSeriesChartPoint & {
  time: DateTime;
  loads: number;
  /** The value in the metric's own unit. */
  value: number;
};

type PinTarget = { cluster: AnnotationCluster; rect: DOMRect };

export function PerformanceChart() {
  const t = useExtracted();
  const { site, bucket, time } = useStore();
  const timezone = useTimezone();
  const { resolvedTheme } = useTheme();
  const { selectedPerformanceMetric: metric, showAnnotations } = usePerformanceStore();
  const metricNames = useMetricNames();
  const ratingLabels = useRatingLabels();
  const visibleAnnotations = useVisibleAnnotations();
  const annotations: Annotation[] = showAnnotations ? visibleAnnotations : [];
  const colors = PERCENTILE_COLORS[resolvedTheme === "light" ? "light" : "dark"];

  const [visiblePercentiles, setVisiblePercentiles] = useState<ReadonlySet<PercentileLevel>>(
    () => new Set<PercentileLevel>(["p50", "p75", "p90"])
  );
  const togglePercentile = (percentile: PercentileLevel) =>
    setVisiblePercentiles(current => {
      const next = new Set(current);
      if (next.has(percentile)) next.delete(percentile);
      else next.add(percentile);
      return next;
    });

  const { data, isLoading, isFetching } = useGetPerformanceTimeSeries({ site });

  const [hoveredPin, setHoveredPin] = useState<PinTarget | null>(null);
  const [selectedPin, setSelectedPin] = useState<PinTarget | null>(null);

  // A pin's card anchors to a snapshot of where the pin was on screen.
  useEffect(() => {
    setSelectedPin(null);
    setHoveredPin(null);
  }, [time, bucket, site, metric, showAnnotations]);

  const thresholds = getPerformanceThresholds(metric);
  const scale = plotScaleOf(metric);

  const { series, chartMin, chartMax, max } = useMemo(() => {
    const { min: boundsMin, max: boundsMax } = getChartTimeBounds(time, bucket, timezone);
    const now = DateTime.now();
    const lowerBoundMs = boundsMin?.getTime();
    const upperBoundMs = (boundsMax ?? now.toJSDate()).getTime();

    const points = new Map<PercentileLevel, VitalPoint[]>(PERCENTILES.map(level => [level, []]));
    data?.forEach(row => {
      const timestamp = DateTime.fromSQL(row.time, { zone: timezone }).toUTC();
      const ms = timestamp.toMillis();
      const loads = Number(row.event_count) || 0;
      // Stale rows from the period just left must not land on the new x axis,
      // and a bucket nobody loaded a page in is a gap, not a zero.
      if (timestamp > now || (lowerBoundMs !== undefined && ms < lowerBoundMs) || ms > upperBoundMs) return;
      if (loads <= 0) return;

      PERCENTILES.forEach(level => {
        if (!visiblePercentiles.has(level)) return;
        const value = row[`${metric}_${level}`];
        if (!isMeasured(value)) return;
        points.get(level)?.push({ x: timestamp.toJSDate(), y: value * scale, value, time: timestamp, loads });
      });
    });

    const series: TimeSeriesChartSeries<VitalPoint>[] = PERCENTILES.filter(level => visiblePercentiles.has(level))
      .map(level => ({ id: level, data: points.get(level) ?? [], color: colors[level], strokeWidth: 2 }))
      .filter(item => item.data.length > 0);

    const all = series.flatMap(item => item.data);
    const highest = all.reduce((largest, point) => Math.max(largest, point.y), 0);

    return {
      series,
      chartMin: boundsMin ?? all[0]?.x,
      chartMax: boundsMax ?? all[all.length - 1]?.x ?? now.toJSDate(),
      max: highest * 1.1,
    };
  }, [data, metric, scale, time, bucket, timezone, visiblePercentiles, colors]);

  const markers: TimeSeriesChartMarker[] = [
    {
      value: thresholds.good * scale,
      color: RATING_COLOR.good,
      strokeDasharray: "6 5",
      label: t("Good ≤ {value}", { value: formatMetric(metric, thresholds.good) }),
    },
    {
      value: thresholds.needs_improvement * scale,
      color: RATING_COLOR.poor,
      strokeDasharray: "6 5",
      label: t("Poor > {value}", { value: formatMetric(metric, thresholds.needs_improvement) }),
    },
  ];

  const hoverLeft =
    hoveredPin && typeof window !== "undefined" ? Math.min(hoveredPin.rect.right + 8, window.innerWidth - 272) : 0;

  return (
    <Card className="overflow-visible">
      {isFetching && <CardLoader />}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 pb-2">
        <div className="font-semibold leading-none tracking-tight">{metricNames[metric]}</div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("Percentiles on the chart")}>
          {PERCENTILES.map(level => (
            <ToggleChip
              key={level}
              isSelected={visiblePercentiles.has(level)}
              onClick={() => togglePercentile(level)}
              swatchColor={colors[level]}
              label={level}
            />
          ))}
        </div>
      </div>

      <div className="px-2 pb-3 md:px-4">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-md" />
        ) : series.length === 0 ? (
          <div className="flex h-[300px] w-full items-center justify-center">
            <div className="text-center text-neutral-500 dark:text-neutral-400">
              <p className="text-base font-medium">
                {visiblePercentiles.size === 0 ? t("Pick a percentile to plot") : t("No performance data available")}
              </p>
              {visiblePercentiles.size > 0 && (
                <p className="text-sm">{t("Try adjusting your date range or filters")}</p>
              )}
            </div>
          </div>
        ) : (
          // Lets the widest y tick ("500ms") spill left of the chart's own margin.
          <div className="h-[300px] w-full [&_svg]:overflow-visible">
            <TimeSeriesChart
              current={[]}
              series={series}
              markers={markers}
              max={max}
              chartMin={chartMin}
              chartMax={chartMax}
              yTickFormat={value => (value === 0 ? "0" : formatMetric(metric, value / scale))}
              renderOverlay={
                annotations.length > 0
                  ? context => (
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
                    )
                  : undefined
              }
              renderTooltip={({ point, points, bucket }) => (
                <ChartTooltip>
                  <div className="min-w-[160px] p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{formatChartDateTime(point.time, bucket)}</span>
                      <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                        {t("{count} loads", { count: point.loads.toLocaleString() })}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {/* Slowest first, the order the lines stack in. */}
                      {[...points].reverse().map(({ id, color, point }) => {
                        const rating = getMetricRating(metric, point.value);
                        return (
                          <div key={id} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                              <span className="h-3 w-1 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
                              {id}
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
                              <RatingMark rating={rating} label={ratingLabels[rating]} />
                              {formatMetric(metric, point.value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ChartTooltip>
              )}
            />
          </div>
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
