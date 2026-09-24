"use client";

import { EventCountRow } from "@/api/admin/endpoints/adminServiceEventCount";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";
import { useNivoTheme } from "@/lib/nivo";
import { formatter } from "@/lib/utils";
import { ResponsiveLine } from "@nivo/line";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";

const CHART_COLORS = [
  "#60a5fa", // blue-400 (pageviews)
  "#fbbf24", // amber-400 (custom events)
  "#a78bfa", // violet-400 (performance)
  "#a3e635", // lime-400 (outbound)
  "#f87171", // red-400 (error)
  "#4ade80", // green-400 (button click)
  "#38bdf8", // sky-400 (copy)
  "#c084fc", // purple-400 (form submit)
  "#f472b6", // pink-400 (input change)
];

export interface EventUsageChartProps {
  data: EventCountRow[] | undefined;
  isLoading: boolean;
  error: unknown;
  height?: string;
  maxTickCount?: number;
}

export function EventUsageChart({
  data,
  isLoading,
  error,
  height = "h-48",
  maxTickCount = 10,
}: EventUsageChartProps) {
  const { width } = useWindowSize();
  const t = useExtracted();
  const nivoTheme = useNivoTheme();
  const { locale, formatDateTime } = useDateTimeFormat();
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const maxTicks = Math.round((width ?? Infinity) / 200);

  const mapEventData = (key: keyof EventCountRow) =>
    data
      ?.map((e) => {
        const timestamp = DateTime.fromSQL(e.event_date).toUTC();
        if (timestamp > DateTime.now()) return null;
        return {
          x: timestamp.toFormat("yyyy-MM-dd"),
          y: e[key] as number,
          currentTime: timestamp,
        };
      })
      .filter((e) => e !== null) || [];

  const allSeries = [
    { id: "pageviews", data: mapEventData("pageview_count") },
    { id: "custom events", data: mapEventData("custom_event_count") },
    { id: "performance", data: mapEventData("performance_count") },
    { id: "outbound", data: mapEventData("outbound_count") },
    { id: "error", data: mapEventData("error_count") },
    { id: "button click", data: mapEventData("button_click_count") },
    { id: "copy", data: mapEventData("copy_count") },
    { id: "form submit", data: mapEventData("form_submit_count") },
    { id: "input change", data: mapEventData("input_change_count") },
  ];

  const activeIndices = allSeries
    .map((s, i) => (s.data.some((d) => d.y > 0) ? i : -1))
    .filter((i) => i !== -1);

  const activeSeries = activeIndices.map((i) => allSeries[i]);
  const activeColors = activeIndices.map((i) => CHART_COLORS[i]);

  const seriesTotals = activeSeries
    .map((series, i) => ({
      id: series.id,
      total: series.data.reduce((acc, d) => acc + d.y, 0),
      color: activeColors[i],
    }))
    .sort((a, b) => b.total - a.total);

  const visibleSeries = activeSeries.filter((s) => !hiddenSeries.has(s.id));
  const visibleColors = activeSeries
    .map((s, i) => ({ color: activeColors[i], hidden: hiddenSeries.has(s.id) }))
    .filter((c) => !c.hidden)
    .map((c) => c.color);

  const maxValue = Math.max(
    ...visibleSeries.flatMap((series) => series.data.map((d) => d.y)),
    1
  );

  const totalEvents = seriesTotals.reduce((acc, s) => acc + s.total, 0);

  const toggleSeries = (id: string) => {
    setHiddenSeries((prev) => {
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
      <div className={`${height} flex-1 min-w-0`}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              {t("Loading usage data...")}
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              {t("Failed to load usage data")}
            </div>
          </div>
        ) : visibleSeries.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-muted-foreground">{t("No data")}</div>
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
              max: maxValue,
            }}
            enableGridX={false}
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
              tickValues: Math.min(maxTicks, maxTickCount),
              format: (value) => {
                return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(value);
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
            enableSlices={"x"}
            colors={visibleColors}
            enableArea={false}
            sliceTooltip={({ slice }: any) => {
              const currentTime = slice.points[0].data
                .currentTime as DateTime;
              const total = slice.points.reduce(
                (acc: number, point: any) =>
                  acc + Number(point.data.yFormatted),
                0
              );

              return (
                <ChartTooltip>
                  <div className="p-3 min-w-[100px]">
                    <div className="font-medium mb-1">
                      {formatDateTime(currentTime, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {slice.points
                      .sort(
                        (a: any, b: any) =>
                          Number(b.data.yFormatted) -
                          Number(a.data.yFormatted)
                      )
                      .map((point: any) => (
                        <div
                          key={point.serieId}
                          className="flex justify-between gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: point.seriesColor,
                              }}
                            />
                            <span>
                              {point.seriesId.charAt(0).toUpperCase() +
                                point.seriesId.slice(1)}
                            </span>
                          </div>
                          <div>
                            {Number(
                              point.data.yFormatted
                            ).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    <div className="mt-2 flex justify-between border-t border-neutral-100 dark:border-neutral-750 pt-2">
                      <div>{t("Total")}</div>
                      <div className="font-semibold">
                        {total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </ChartTooltip>
              );
            }}
          />
        )}
      </div>
      <div className="flex flex-col justify-center text-xs min-w-[140px] gap-1.5">
        {seriesTotals.map((s) => {
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
                  className={`truncate transition-opacity ${
                    isHidden
                      ? "text-neutral-400 dark:text-neutral-600 line-through"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {s.id.charAt(0).toUpperCase() + s.id.slice(1)}
                </span>
              </div>
              <span
                className={`font-medium tabular-nums transition-opacity ${
                  isHidden ? "opacity-30" : ""
                }`}
              >
                {s.total.toLocaleString()}
              </span>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-700 pt-1.5 mt-0.5">
          <span className="text-neutral-600 dark:text-neutral-400">{t("Total")}</span>
          <span className="font-semibold tabular-nums">
            {totalEvents.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
