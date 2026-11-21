"use client";

import type { DashboardCardMapping } from "@rybbit/shared";
import { useMemo } from "react";
import type { CustomQueryRow } from "@/api/analytics/endpoints";
import { TimeSeriesChart, type TimeSeriesChartSeries } from "@/components/charts/TimeSeriesChart";
import { getChartTimeBounds } from "@/components/charts/timeSeriesChartUtils";
import { getTimezone, useStore } from "@/lib/store";
import { formatter } from "@/lib/utils";
import { buildChartAxis, buildWideData, parseChartDate } from "../../utils";
import { CardLegend, ChartEmpty, DashboardTooltip, toCardSeries } from "./shared";

type DashboardLineChartProps = {
  rows: CustomQueryRow[];
  mapping: DashboardCardMapping;
  /** Fill the area beneath the line (single-series only). */
  area?: boolean;
};

type LinePoint = { x: Date; y: number; label: string };

// Spacing for non-time categories that still need a monotonic time domain so the
// d3 time scale renders them in order (one synthetic day per row).
const SYNTH_EPOCH = Date.UTC(2000, 0, 1);
const SYNTH_STEP = 86_400_000;

export function DashboardLineChart({ rows, mapping, area = false }: DashboardLineChartProps) {
  const time = useStore(state => state.time);
  const bucket = useStore(state => state.bucket);
  const timezone = getTimezone();

  const wide = useMemo(() => buildWideData(rows, mapping), [rows, mapping]);
  const axis = useMemo(
    () => buildChartAxis(wide ? wide.data.map(entry => String(entry[wide.indexBy])) : [], bucket),
    [wide, bucket]
  );

  const { series, max, chartMin, chartMax } = useMemo(() => {
    if (!wide) {
      return { series: [] as TimeSeriesChartSeries<LinePoint>[], max: 1, chartMin: undefined, chartMax: undefined };
    }

    const series: TimeSeriesChartSeries<LinePoint>[] = toCardSeries(wide.keys).map(item => ({
      id: item.label,
      color: item.color,
      data: wide.data
        .map((entry, index) => {
          const raw = String(entry[wide.indexBy] ?? "");
          const parsed = axis.isTime ? parseChartDate(raw) : null;
          return {
            x: parsed ? parsed.toJSDate() : new Date(SYNTH_EPOCH + index * SYNTH_STEP),
            y: Number(entry[item.key]) || 0,
            label: axis.isTime ? axis.format(raw) : raw,
          } satisfies LinePoint;
        })
        .sort((a, b) => a.x.getTime() - b.x.getTime()),
    }));

    let max = 0;
    for (const item of series) {
      for (const point of item.data) {
        if (point.y > max) max = point.y;
      }
    }

    let chartMin: Date | undefined;
    let chartMax: Date | undefined;
    if (axis.isTime) {
      const bounds = getChartTimeBounds(time, bucket, timezone);
      chartMin = bounds.min;
      chartMax = bounds.max;
    }
    if (!chartMin || !chartMax) {
      const xs = series.flatMap(item => item.data.map(point => point.x.getTime()));
      if (xs.length) {
        const min = Math.min(...xs);
        const maxX = Math.max(...xs);
        chartMin = new Date(min);
        chartMax = new Date(maxX === min ? min + SYNTH_STEP : maxX);
      }
    }

    return { series, max: max || 1, chartMin, chartMax };
  }, [wide, axis, time, bucket, timezone]);

  if (!wide || series.length === 0 || series.every(item => item.data.length === 0)) {
    return <ChartEmpty />;
  }

  const multi = series.length > 1;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <TimeSeriesChart<LinePoint>
          current={multi ? [] : series[0].data}
          series={multi ? series : undefined}
          currentColor={series[0].color}
          currentAreaOpacity={area && !multi ? 0.25 : 0}
          max={max}
          chartMin={chartMin}
          chartMax={chartMax}
          disableDragZoom
          yTickFormat={formatter}
          renderTooltip={({ point, points }) => {
            const items = multi
              ? points.map(entry => ({
                  label: entry.id,
                  color: entry.color,
                  value: entry.point.y,
                }))
              : [{ label: series[0].id, color: series[0].color, value: point.y }];
            return <DashboardTooltip title={point.label} items={items} />;
          }}
        />
      </div>
      {multi && <CardLegend series={toCardSeries(wide.keys)} />}
    </div>
  );
}
