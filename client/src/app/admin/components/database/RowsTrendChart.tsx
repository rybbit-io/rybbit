"use client";

import { ResponsiveLine } from "@nivo/line";
import { useNivoTheme } from "@/lib/nivo";
import { RowsByDate } from "@/api/admin/endpoints/clickhouseStats";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { DateTime } from "luxon";
import { userLocale } from "@/lib/dateTimeUtils";
import { useWindowSize } from "@uidotdev/usehooks";
import { formatter } from "@/lib/utils";
import { useState } from "react";

const CHART_COLORS = [
  "#60a5fa", // blue-400
  "#818cf8", // indigo-400
  "#a78bfa", // violet-400
  "#34d399", // emerald-400
];

interface RowsTrendChartProps {
  rowsByDate: RowsByDate[] | undefined;
  isLoading: boolean;
  days: number;
}

export function RowsTrendChart({ rowsByDate, isLoading, days }: RowsTrendChartProps) {
  const nivoTheme = useNivoTheme();
  const { width } = useWindowSize();
  const maxTicks = Math.round((width ?? Infinity) / 100);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="h-64">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!rowsByDate || rowsByDate.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
        No rows trend data available
      </div>
    );
  }

  // Group by table
  const tableGroups = rowsByDate.reduce(
    (acc, row) => {
      if (!acc[row.table]) {
        acc[row.table] = [];
      }
      acc[row.table].push(row);
      return acc;
    },
    {} as Record<string, RowsByDate[]>
  );

  // Filter to exclude bad/future dates
  const now = DateTime.now();
  const cutoff = days > 0 ? now.minus({ days }) : null;

  const allSeries = Object.entries(tableGroups).map(([table, rows]) => ({
    id: table,
    data: rows
      .map(row => {
        const dt = DateTime.fromSQL(row.date);
        return {
          x: dt.toFormat("yyyy-MM-dd"),
          y: row.rowsInserted,
          currentTime: dt,
        };
      })
      .filter(point => point.currentTime.isValid && point.currentTime <= now && (!cutoff || point.currentTime >= cutoff))
      .sort((a, b) => a.currentTime.toMillis() - b.currentTime.toMillis()),
  }));

  const seriesTotals = allSeries
    .map((series, i) => ({
      id: series.id,
      total: series.data.reduce((acc, d) => acc + d.y, 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .sort((a, b) => b.total - a.total);

  const visibleSeries = allSeries.filter(s => !hiddenSeries.has(s.id));
  const visibleColors = allSeries
    .map((s, i) => ({ color: CHART_COLORS[i % CHART_COLORS.length], hidden: hiddenSeries.has(s.id) }))
    .filter(c => !c.hidden)
    .map(c => c.color);

  const totalRows = seriesTotals.reduce((acc, s) => acc + s.total, 0);

  const toggleSeries = (id: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex gap-6">
      <div className="h-64 flex-1 min-w-0">
        {visibleSeries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">
            No series selected
          </div>
        ) : (
          <ResponsiveLine
            data={visibleSeries}
            theme={nivoTheme}
            margin={{ top: 10, right: 10, bottom: 25, left: 40 }}
            xScale={{
              type: "time",
              format: "%Y-%m-%d",
              precision: "day",
              useUTC: true,
            }}
            yScale={{
              type: "linear",
              min: 0,
              stacked: false,
              reverse: false,
            }}
            enableGridX={true}
            enableGridY={true}
            gridYValues={5}
            yFormat=" >-.0f"
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: 10,
              tickRotation: 0,
              truncateTickAt: 0,
              tickValues: Math.min(maxTicks, 10),
              format: value => {
                const dt = DateTime.fromJSDate(value).setLocale(userLocale);
                return dt.toFormat("MMM d");
              },
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 10,
              tickRotation: 0,
              truncateTickAt: 0,
              tickValues: 5,
              format: formatter,
            }}
            enableTouchCrosshair={true}
            enablePoints={false}
            useMesh={true}
            animate={false}
            enableSlices="x"
            colors={visibleColors}
            enableArea={false}
            sliceTooltip={({ slice }: any) => {
              const point = slice.points[0];

              return (
                <ChartTooltip>
                  <div className="p-3 min-w-[140px]">
                    <div className="font-medium mb-1">
                      {point.data.currentTime.toLocaleString(DateTime.DATE_SHORT)}
                    </div>
                    {slice.points.map((point: any) => (
                      <div key={point.seriesId} className="flex justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: point.seriesColor }} />
                          <span className="text-xs truncate max-w-[80px]">{point.seriesId}</span>
                        </div>
                        <div>{formatter(Number(point.data.yFormatted))}</div>
                      </div>
                    ))}
                  </div>
                </ChartTooltip>
              );
            }}
          />
        )}
      </div>
      <div className="flex flex-col justify-center text-xs min-w-[180px] gap-1.5">
        {seriesTotals.map(s => {
          const isHidden = hiddenSeries.has(s.id);
          return (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 cursor-pointer select-none"
              onClick={() => toggleSeries(s.id)}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0 transition-opacity"
                  style={{
                    backgroundColor: s.color,
                    opacity: isHidden ? 0.3 : 1,
                  }}
                />
                <span
                  className={`truncate font-mono transition-opacity ${
                    isHidden
                      ? "text-neutral-400 dark:text-neutral-600 line-through"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {s.id}
                </span>
              </div>
              <span
                className={`font-medium tabular-nums transition-opacity ${
                  isHidden ? "opacity-30" : ""
                }`}
              >
                {formatter(s.total)}
              </span>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-700 pt-1.5 mt-0.5">
          <span className="text-neutral-600 dark:text-neutral-400">Total</span>
          <span className="font-semibold tabular-nums">
            {formatter(totalRows)}
          </span>
        </div>
      </div>
    </div>
  );
}
