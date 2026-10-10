"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { SiteEventCountPoint } from "@/api/analytics/endpoints";
import { useGetSiteEventCount } from "@/api/analytics/hooks/events/useGetSiteEventCount";
import { percentDelta } from "@/lib/delta";
import { getTimezone, useComparisonEnabled } from "@/lib/store";
import { DEFAULT_HIDDEN_TYPES, EVENT_TYPE_SERIES, totalsByType } from "../utils/eventTypes";
import { ChartLegend, LegendRow } from "./ChartLegend";
import { ChartPanel } from "./ChartPanel";
import { ChartSeries, ComparisonBucket, EventSeriesChart } from "./EventSeriesChart";
import { EventTypeMark, useEventTypeLabels } from "./EventTypeMark";

type TimedPoint = { point: SiteEventCountPoint; time: DateTime };

// Oldest first, without the buckets that have not started yet.
const toTimedPoints = (points: SiteEventCountPoint[] | undefined, timezone: string): TimedPoint[] => {
  const now = DateTime.now().toUTC();
  return (points ?? [])
    .map(point => ({ point, time: DateTime.fromSQL(point.time, { zone: timezone }).toUTC() }))
    .filter(({ time }) => time.isValid && time <= now)
    .sort((a, b) => a.time.toMillis() - b.time.toMillis());
};

export function EventTypesChart() {
  const t = useExtracted();
  const { plural } = useEventTypeLabels();
  const timezone = getTimezone();
  const comparisonEnabled = useComparisonEnabled();
  // Pending, not loading: the query waits for the site, and "no events" is not true yet.
  const { data, isPending: isLoading, isError } = useGetSiteEventCount();
  const { data: previousData } = useGetSiteEventCount({ periodTime: "previous" });
  // A disabled query keeps its last result, so the switch is read here.
  const previous = comparisonEnabled ? previousData : undefined;
  const [hidden, setHidden] = useState<ReadonlySet<string>>(DEFAULT_HIDDEN_TYPES);

  const toggle = (type: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const points = toTimedPoints(data, timezone);
  const previousPoints = toTimedPoints(previous, timezone);
  const totals = totalsByType(data);
  const previousTotals = totalsByType(previous);

  // A type appears once it has fired in either period, so one that stopped still shows its drop.
  const present = EVENT_TYPE_SERIES.filter(series => totals[series.type] > 0 || previousTotals[series.type] > 0);
  const visible = present.filter(series => !hidden.has(series.type));

  const series: ChartSeries[] = visible.map(config => ({
    id: plural[config.type],
    color: config.color,
    data: points.map(({ point, time }, index) => ({
      x: time.toFormat("yyyy-MM-dd HH:mm:ss"),
      y: Number(point[config.countKey]) || 0,
      currentTime: time,
      index,
    })),
  }));

  // The server fills empty buckets in both periods, so position n is the same
  // distance into each of them.
  const comparison: ComparisonBucket[] | undefined = previous
    ? previousPoints.map(({ point, time }) => ({
        time,
        total: visible.reduce((sum, config) => sum + (Number(point[config.countKey]) || 0), 0),
      }))
    : undefined;

  const legendRows: LegendRow[] = present.map(config => ({
    id: config.type,
    label: plural[config.type],
    color: config.color,
    icon: <EventTypeMark type={config.type} className="h-3.5 w-3.5" />,
    total: totals[config.type],
    delta: previous ? percentDelta(totals[config.type], previousTotals[config.type]) : null,
    upIsGood: config.upIsGood,
  }));

  const hasHiddenPerformance = present.some(config => config.type === "performance");
  const placeholder = isError
    ? {
        title: t("Failed to load events"),
        description: t("There was a problem fetching the events. Please try again later."),
      }
    : present.length === 0
      ? { title: t("No events in this period"), description: t("Try a different date range or filter") }
      : visible.length === 0
        ? { title: t("All event types hidden"), description: t("Click a type to show it") }
        : null;

  return (
    <ChartPanel
      title={t("Events by type")}
      isLoading={isLoading}
      placeholder={placeholder}
      chart={<EventSeriesChart series={series} comparison={comparison} showTotal />}
      legend={
        <ChartLegend
          rows={legendRows}
          hidden={hidden}
          onToggle={toggle}
          nameLabel={t("Type")}
          showDelta={comparisonEnabled}
          hasIcons
          isLoading={isLoading}
          note={
            present.length === 0
              ? undefined
              : hasHiddenPerformance
                ? t("Click a type to show or hide it. Pageviews and performance events are hidden by default.")
                : t("Click a type to show or hide it. Pageviews are hidden by default.")
          }
        />
      }
    />
  );
}
