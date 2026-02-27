"use client";

import { ResponsiveLine, SliceTooltipProps } from "@nivo/line";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState } from "react";

import { useExtracted } from "next-intl";
import { useGetEventBucketed } from "@/api/analytics/hooks/events/useGetEventBucketed";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CardLoader } from "@/components/ui/card";
import { ChartLegend } from "./ChartLegend";
import { formatChartDateTime, hour12, userLocale } from "@/lib/dateTimeUtils";
import { useNivoTheme } from "@/lib/nivo";
import { getTimezone, useStore } from "@/lib/store";
import { formatter } from "@/lib/utils";

const COLOR_PALETTE = [
  "hsl(var(--dataviz))",
  "hsl(var(--green-400))",
  "hsl(var(--amber-400))",
  "hsl(var(--red-400))",
  "hsl(var(--teal-400))",
  "hsl(var(--cyan-400))",
  "hsl(var(--orange-400))",
  "hsl(var(--blue-400))",
  "hsl(var(--indigo-400))",
  "hsl(var(--violet-400))",
];

type EventPoint = {
  x: string;
  y: number;
  currentTime: DateTime;
};

type EventSeries = {
  id: string;
  color: string;
  data: EventPoint[];
};

export function CustomEventsChart({ eventLimit }: { eventLimit: number }) {
  const t = useExtracted();
  const { bucket } = useStore();
  const { data, isLoading } = useGetEventBucketed({ limit: eventLimit });
  const { width } = useWindowSize();
  const nivoTheme = useNivoTheme();
  const timezone = getTimezone();
  const [hiddenEventNames, setHiddenEventNames] = useState<Set<string>>(new Set());

  const toggleEventVisibility = (eventName: string) => {
    setHiddenEventNames(prev => {
      const next = new Set(prev);
      if (next.has(eventName)) {
        next.delete(eventName);
      } else {
        next.add(eventName);
      }
      return next;
    });
  };

  useEffect(() => {
    setHiddenEventNames(new Set());
  }, [eventLimit]);

  const { series, legendItems, maxValue, totalPoints } = useMemo(() => {
    if (!data || data.length === 0) {
      return { series: [] as EventSeries[], legendItems: [], maxValue: 1, totalPoints: 0 };
    }

    const timeLookup = new Map<string, DateTime>();
    const countsByEvent = new Map<string, Map<string, number>>();
    const totalsByEvent = new Map<string, number>();

    data.forEach(item => {
      const timestamp = DateTime.fromSQL(item.time, { zone: timezone }).toUTC();
      if (!timestamp.isValid || timestamp > DateTime.now().toUTC()) {
        return;
      }

      const timeKey = timestamp.toFormat("yyyy-MM-dd HH:mm:ss");
      timeLookup.set(timeKey, timestamp);

      if (!countsByEvent.has(item.event_name)) {
        countsByEvent.set(item.event_name, new Map());
      }

      countsByEvent.get(item.event_name)!.set(timeKey, item.event_count);
      totalsByEvent.set(item.event_name, (totalsByEvent.get(item.event_name) ?? 0) + item.event_count);
    });

    const sortedTimes = Array.from(timeLookup.entries()).sort((a, b) => a[1].toMillis() - b[1].toMillis());
    const sortedEventNames = Array.from(countsByEvent.keys()).sort(
      (a, b) => (totalsByEvent.get(b) ?? 0) - (totalsByEvent.get(a) ?? 0)
    );

    const seriesData = sortedEventNames.map((eventName, index) => {
      const counts = countsByEvent.get(eventName)!;
      return {
        id: eventName,
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
        data: sortedTimes.map(([timeKey, timeValue]) => ({
          x: timeKey,
          y: counts.get(timeKey) ?? 0,
          currentTime: timeValue,
        })),
      };
    });

    const values = seriesData.flatMap(serie => serie.data.map(point => point.y));
    const maxValue = values.length > 0 ? Math.max(...values) : 1;

    return {
      series: seriesData,
      legendItems: seriesData.map(serie => ({ id: serie.id, color: serie.color })),
      maxValue,
      totalPoints: sortedTimes.length,
    };
  }, [data, timezone]);

  const maxTicks = Math.round((width ?? 900) / 85);
  const visibleSeries = series.filter(serie => !hiddenEventNames.has(serie.id));
  const visibleValues = visibleSeries.flatMap(serie => serie.data.map(point => point.y));
  const visibleMaxValue = visibleValues.length > 0 ? Math.max(...visibleValues) : maxValue;
  const isAllHidden = series.length > 0 && visibleSeries.length === 0;

  const formatXAxisValue = (value: Date) => {
    const dt = DateTime.fromJSDate(value, { zone: "utc" }).setZone(timezone).setLocale(userLocale);
    if (["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour"].includes(bucket)) {
      return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
    }
    return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
  };

  return (
    <>
      {isLoading && (
        <div className="absolute top-[-54px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}

      {isAllHidden ? (
        <div className="h-[260px] w-full flex items-center justify-center">
          <div className="text-center text-neutral-500">
            <p className="text-sm font-medium">{t("All event series hidden")}</p>
            <p className="text-xs">{t("Click a legend item to show it")}</p>
          </div>
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveLine
            data={visibleSeries}
            theme={nivoTheme}
            margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
            xScale={{
              type: "time",
              format: "%Y-%m-%d %H:%M:%S",
              precision: "second",
              useUTC: true,
            }}
            yScale={{
              type: "linear",
              min: 0,
              stacked: false,
              reverse: false,
              max: Math.max(visibleMaxValue, 1),
            }}
            enableGridX={true}
            enableGridY={true}
            gridYValues={5}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 10,
              tickRotation: 0,
              truncateTickAt: 0,
              tickValues: totalPoints > 0 ? Math.min(maxTicks, totalPoints) : undefined,
              format: formatXAxisValue,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 10,
              tickRotation: 0,
              truncateTickAt: 0,
              tickValues: 5,
              format: formatter,
            }}
            colors={datum => datum.color}
            enableTouchCrosshair={true}
            enablePoints={false}
            useMesh={true}
            animate={false}
            enableSlices="x"
            lineWidth={2}
            sliceTooltip={({ slice }: SliceTooltipProps<EventSeries>) => {
              const currentTime = slice.points[0]?.data.currentTime as DateTime | undefined;
              const sortedPoints = [...slice.points].sort(
                (a, b) => Number(b.data.yFormatted) - Number(a.data.yFormatted)
              );

              return (
                <ChartTooltip>
                  <div className="p-3 min-w-[160px]">
                    {currentTime && <div className="mb-2">{formatChartDateTime(currentTime, bucket)}</div>}
                    <div className="space-y-1">
                      {sortedPoints.map(point => (
                        <div key={point.id} className="flex justify-between items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 rounded-[3px]" style={{ backgroundColor: point.seriesColor }} />
                            <span className="text-neutral-600 dark:text-neutral-300 max-w-[140px] truncate">
                              {point.seriesId}
                            </span>
                          </div>
                          <span className="font-medium text-neutral-700 dark:text-neutral-200">
                            {formatter(Number(point.data.yFormatted))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartTooltip>
              );
            }}
          />
        </div>
      )}

      <ChartLegend items={legendItems} hiddenItems={hiddenEventNames} onToggle={toggleEventVisibility} />
    </>
  );
}
