"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { useGetEventBucketed } from "@/api/analytics/hooks/events/useGetEventBucketed";
import { useGetEventNames } from "@/api/analytics/hooks/events/useGetEventNames";
import { percentDelta } from "@/lib/delta";
import { getTimezone, useComparisonEnabled } from "@/lib/store";
import { seriesColor } from "../utils/eventTypes";
import { ChartLegend, LegendRow } from "./ChartLegend";
import { ChartPanel } from "./ChartPanel";
import { ChartSeries, EventSeriesChart } from "./EventSeriesChart";

/** The most-fired custom events, one line each. Remount (key) to reset the hidden lines when the limit changes. */
export function CustomEventsChart({ eventLimit }: { eventLimit: number }) {
  const t = useExtracted();
  const timezone = getTimezone();
  const comparisonEnabled = useComparisonEnabled();
  // Pending, not loading: the query waits for the site, and "no events" is not true yet.
  const { data, isPending: isLoading, isError } = useGetEventBucketed({ limit: eventLimit });
  const { data: previousNames } = useGetEventNames({ periodTime: "previous" });
  // A disabled query keeps its last result, so the switch is read here.
  const previous = comparisonEnabled ? previousNames : undefined;
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const toggle = (eventName: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(eventName)) {
        next.delete(eventName);
      } else {
        next.add(eventName);
      }
      return next;
    });
  };

  const now = DateTime.now().toUTC();
  const times = new Map<string, DateTime>();
  const countsByEvent = new Map<string, Map<string, number>>();
  const totalsByEvent = new Map<string, number>();

  for (const item of data ?? []) {
    const time = DateTime.fromSQL(item.time, { zone: timezone }).toUTC();
    if (!time.isValid || time > now) continue;

    const key = time.toFormat("yyyy-MM-dd HH:mm:ss");
    const name = String(item.event_name);
    times.set(key, time);
    if (!countsByEvent.has(name)) countsByEvent.set(name, new Map());
    countsByEvent.get(name)!.set(key, item.event_count);
    totalsByEvent.set(name, (totalsByEvent.get(name) ?? 0) + item.event_count);
  }

  const sortedTimes = Array.from(times.entries()).sort((a, b) => a[1].toMillis() - b[1].toMillis());
  const names = Array.from(countsByEvent.keys()).sort(
    (a, b) => (totalsByEvent.get(b) ?? 0) - (totalsByEvent.get(a) ?? 0)
  );
  // Fixed by rank, so hiding a line does not recolour the others.
  const colors = new Map(names.map((name, index) => [name, seriesColor(index)]));

  const series: ChartSeries[] = names
    .filter(name => !hidden.has(name))
    .map(name => ({
      id: name,
      color: colors.get(name)!,
      data: sortedTimes.map(([key, time], index) => ({
        x: key,
        y: countsByEvent.get(name)!.get(key) ?? 0,
        currentTime: time,
        index,
      })),
    }));

  const previousCounts = new Map((previous ?? []).map(event => [String(event.eventName), event.count]));
  const legendRows: LegendRow[] = names.map(name => ({
    id: name,
    label: name,
    color: colors.get(name)!,
    total: totalsByEvent.get(name) ?? 0,
    delta: previous ? percentDelta(totalsByEvent.get(name) ?? 0, previousCounts.get(name) ?? 0) : null,
  }));

  const placeholder = isError
    ? {
        title: t("Failed to load events"),
        description: t("There was a problem fetching the events. Please try again later."),
      }
    : names.length === 0
      ? { title: t("No custom events in this period"), description: t("Try a different date range or filter") }
      : series.length === 0
        ? { title: t("All event series hidden"), description: t("Click an event to show it") }
        : null;

  return (
    <ChartPanel
      title={t("Events by name")}
      isLoading={isLoading}
      placeholder={placeholder}
      chart={<EventSeriesChart series={series} />}
      legend={
        <ChartLegend
          rows={legendRows}
          hidden={hidden}
          onToggle={toggle}
          nameLabel={t("Event")}
          showDelta={comparisonEnabled}
          isLoading={isLoading}
          note={names.length === 0 ? undefined : t("Click an event to show or hide it.")}
        />
      }
    />
  );
}
