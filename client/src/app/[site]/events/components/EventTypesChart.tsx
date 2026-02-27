"use client";

import { ResponsiveLine, SliceTooltipProps } from "@nivo/line";
import { useWindowSize } from "@uidotdev/usehooks";
import { DateTime } from "luxon";
import { useMemo, useState } from "react";

import { useExtracted } from "next-intl";
import { useGetSiteEventCount } from "@/api/analytics/hooks/events/useGetSiteEventCount";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { ChartLegend } from "./ChartLegend";
import { formatChartDateTime, hour12, userLocale } from "@/lib/dateTimeUtils";
import { useNivoTheme } from "@/lib/nivo";
import { getTimezone, useStore } from "@/lib/store";
import { formatter } from "@/lib/utils";
import { CardLoader } from "../../../../components/ui/card";

const EVENT_TYPE_CONFIG = [
  { key: "pageview_count", label: "Pageviews", color: "#60a5fa" },
  { key: "custom_event_count", label: "Custom Events", color: "#fbbf24" },
  { key: "performance_count", label: "Performance", color: "#a78bfa" },
  { key: "outbound_count", label: "Outbound", color: "#a3e635" },
  { key: "error_count", label: "Errors", color: "#f87171" },
  { key: "button_click_count", label: "Button Clicks", color: "#4ade80" },
  { key: "copy_count", label: "Copy", color: "#38bdf8" },
  { key: "form_submit_count", label: "Form Submits", color: "#c084fc" },
  { key: "input_change_count", label: "Input Changes", color: "#f472b6" },
] as const;

// Translated labels keyed by the raw label
function getTranslatedEventTypeLabels(t: (key: string) => string): Record<string, string> {
  return {
    Pageviews: t("Pageviews"),
    "Custom Events": t("Custom Events"),
    Performance: t("Performance"),
    Outbound: t("Outbound"),
    Errors: t("Errors"),
    "Button Clicks": t("Button Clicks"),
    Copy: t("Copy"),
    "Form Submits": t("Form Submits"),
    "Input Changes": t("Input Changes"),
  };
}

type EventTypeKey = (typeof EVENT_TYPE_CONFIG)[number]["key"];

type DataPoint = {
  x: string;
  y: number;
  currentTime: DateTime;
};

type Series = {
  id: string;
  color: string;
  data: DataPoint[];
};

export function EventTypesChart() {
  const t = useExtracted();
  const { bucket } = useStore();
  const { data, isLoading } = useGetSiteEventCount();
  const { width } = useWindowSize();
  const nivoTheme = useNivoTheme();
  const timezone = getTimezone();
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

  const toggleTypeVisibility = (typeLabel: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeLabel)) {
        next.delete(typeLabel);
      } else {
        next.add(typeLabel);
      }
      return next;
    });
  };

  const translatedLabels = getTranslatedEventTypeLabels(t);

  const { series, legendItems, maxValue, totalPoints } = useMemo(() => {
    if (!data || data.length === 0) {
      return { series: [] as Series[], legendItems: [], maxValue: 1, totalPoints: 0 };
    }

    const sortedData = [...data].sort((a, b) => {
      const ta = DateTime.fromSQL(a.time, { zone: timezone }).toMillis();
      const tb = DateTime.fromSQL(b.time, { zone: timezone }).toMillis();
      return ta - tb;
    });

    const allSeries: Series[] = EVENT_TYPE_CONFIG.map((config) => ({
      id: translatedLabels[config.label] || config.label,
      color: config.color,
      data: sortedData
        .map((row) => {
          const timestamp = DateTime.fromSQL(row.time, { zone: timezone }).toUTC();
          if (!timestamp.isValid || timestamp > DateTime.now().toUTC()) {
            return null;
          }
          return {
            x: timestamp.toFormat("yyyy-MM-dd HH:mm:ss"),
            y: row[config.key as EventTypeKey] as number,
            currentTime: timestamp,
          };
        })
        .filter((p): p is DataPoint => p !== null),
    }));

    // Only include series that have at least one non-zero value
    const activeSeries = allSeries.filter((s) => s.data.some((d) => d.y > 0));

    const values = activeSeries.flatMap((s) => s.data.map((d) => d.y));
    const maxValue = values.length > 0 ? Math.max(...values) : 1;
    const totalPoints = activeSeries.length > 0 ? activeSeries[0].data.length : 0;

    return {
      series: activeSeries,
      legendItems: activeSeries.map((s) => ({ id: s.id, color: s.color })),
      maxValue,
      totalPoints,
    };
  }, [data, timezone, translatedLabels]);

  const maxTicks = Math.round((width ?? 900) / 85);
  const visibleSeries = series.filter((s) => !hiddenTypes.has(s.id));
  const visibleValues = visibleSeries.flatMap((s) => s.data.map((d) => d.y));
  const visibleMaxValue = visibleValues.length > 0 ? Math.max(...visibleValues) : maxValue;
  const isAllHidden = series.length > 0 && visibleSeries.length === 0;

  const formatXAxisValue = (value: Date) => {
    const dt = DateTime.fromJSDate(value, { zone: "utc" }).setZone(timezone).setLocale(userLocale);
    if (["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour"].includes(bucket)) {
      return dt.toFormat(hour12 ? "h:mm" : "HH:mm");
    }
    return dt.toFormat(hour12 ? "MMM d" : "dd MMM");
  };


  if (isAllHidden) {
    return (
      <>
        <div className="h-[260px] w-full flex items-center justify-center">
          <div className="text-center text-neutral-500">
            <p className="text-sm font-medium">{t("All event types hidden")}</p>
            <p className="text-xs">{t("Click a legend item to show it")}</p>
          </div>
        </div>
        <ChartLegend items={legendItems} hiddenItems={hiddenTypes} onToggle={toggleTypeVisibility} />
      </>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute top-[-54px] left-0 w-full h-full">
          <CardLoader />
        </div>
      )}
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
          colors={(datum) => datum.color}
          enableTouchCrosshair={true}
          enablePoints={false}
          useMesh={true}
          animate={false}
          enableSlices="x"
          lineWidth={2}
          sliceTooltip={({ slice }: SliceTooltipProps<Series>) => {
            const currentTime = slice.points[0]?.data.currentTime as DateTime | undefined;
            const sortedPoints = [...slice.points].sort(
              (a, b) => Number(b.data.yFormatted) - Number(a.data.yFormatted)
            );
            const total = sortedPoints.reduce((acc, p) => acc + Number(p.data.yFormatted), 0);

            return (
              <ChartTooltip>
                <div className="p-3 min-w-[160px]">
                  {currentTime && <div className="mb-2">{formatChartDateTime(currentTime, bucket)}</div>}
                  <div className="space-y-1">
                    {sortedPoints.map((point) => (
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
                  <div className="mt-2 flex justify-between border-t border-neutral-100 dark:border-neutral-750 pt-2">
                    <span className="text-neutral-600 dark:text-neutral-300">{t("Total")}</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                      {formatter(total)}
                    </span>
                  </div>
                </div>
              </ChartTooltip>
            );
          }}
        />
      </div>

      <ChartLegend items={legendItems} hiddenItems={hiddenTypes} onToggle={toggleTypeVisibility} />
    </>
  );
}
