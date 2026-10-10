"use client";

import { ResponsiveLine } from "@nivo/line";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";
import type { PageTrend } from "@/api/analytics/hooks/useGetPages";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { hour12, userLocale } from "@/lib/dateTimeUtils";
import { useNivoTheme } from "@/lib/nivo";
import { useTimezone } from "@/lib/store";

interface PageSparklineChartProps {
  /** Views per bucket. Undefined once loaded means the row had no views to plot. */
  series: PageTrend["series"] | undefined;
  /** Names the line for the tooltip: the page title or the section. */
  label: string;
  isLoading: boolean;
}

const formatDateTime = (dt: DateTime, tz: string) =>
  new Intl.DateTimeFormat(userLocale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: hour12,
    timeZone: tz,
  }).format(dt.toJSDate());

export function PageSparklineChart({ series, label, isLoading }: PageSparklineChartProps) {
  const t = useExtracted();
  const nivoTheme = useNivoTheme();
  const timezone = useTimezone();
  const [isHovering, setIsHovering] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-6 w-full rounded" />;
  }

  const now = DateTime.now();
  const points = (series ?? [])
    .map(point => {
      const time = DateTime.fromSQL(point.time, { zone: timezone }).toUTC();
      return { x: time.toFormat("yyyy-MM-dd HH:mm:ss"), y: point.pageviews, time };
    })
    // The window is filled to its end; buckets that have not happened yet are not zeros.
    .filter(point => point.time <= now);

  if (points.length === 0) {
    return (
      <div className="flex h-6 w-full items-center">
        <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  return (
    <div className="h-6 w-full" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <ResponsiveLine
        data={[{ id: label, data: points }]}
        theme={nivoTheme}
        margin={{ top: 3, right: 1, bottom: 1, left: 1 }}
        xScale={{ type: "time", format: "%Y-%m-%d %H:%M:%S", precision: "second", useUTC: true }}
        yScale={{ type: "linear", min: 0, stacked: false, reverse: false }}
        enableGridX={false}
        enableGridY={false}
        axisTop={null}
        axisRight={null}
        axisBottom={null}
        axisLeft={null}
        enableTouchCrosshair={true}
        enablePoints={false}
        useMesh={true}
        animate={false}
        enableSlices="x"
        colors={[isHovering ? "hsl(var(--dataviz-2))" : "hsl(var(--dataviz))"]}
        lineWidth={1.5}
        enableArea={true}
        areaBaselineValue={0}
        areaOpacity={0.3}
        curve="linear"
        defs={[
          {
            id: "gradient",
            type: "linearGradient",
            colors: [
              { offset: 0, color: "hsl(var(--dataviz))", opacity: 1 },
              { offset: 100, color: "hsl(var(--dataviz))", opacity: 0 },
            ],
          },
        ]}
        fill={[{ match: () => true, id: "gradient" }]}
        sliceTooltip={({ slice }) => {
          const point = slice.points[0];
          const { time, y } = point.data as unknown as { time: DateTime; y: number };

          return (
            <ChartTooltip>
              <div className="p-2">
                <div className="flex items-center justify-between gap-3">
                  <div>{formatDateTime(time, timezone)}</div>
                  <div className="font-medium tabular-nums">
                    {t("{count, plural, one {# view} other {# views}}", { count: y })}
                  </div>
                </div>
              </div>
            </ChartTooltip>
          );
        }}
      />
    </div>
  );
}
