"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { EVENT_FILTERS } from "@/lib/filterGroups";
import { useGetEventNames } from "../../../api/analytics/hooks/events/useGetEventNames";
import { useGetEventNameStats } from "../../../api/analytics/hooks/events/useGetEventNameStats";
import { useGetSilentEvents } from "../../../api/analytics/hooks/events/useGetSilentEvents";
import { BucketSelection } from "../../../components/BucketSelection";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { AnalysisBar } from "../../../components/site/AnalysisBar";
import { BreakdownControl } from "../../../components/site/BreakdownControl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useComparisonEnabled, useStore, useTimezone } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { EventLog } from "./components/EventLog";
import { EventNamesCard } from "./components/EventNames/EventNamesCard";
import { EVENT_LIMIT_OPTIONS, EventsBreakdown, EventsChart } from "./components/EventsChart";
import { EventsStatBand } from "./components/EventsStatBand";
import { SilentEventNotice } from "./components/SilentEventNotice";
import { buildEventNameRows, countNewEventNames } from "./utils/eventNameRows";
import { trendBucketFor } from "./utils/trendBucket";

export default function EventsPage() {
  const t = useExtracted();
  useSetPageTitle("Events");

  const time = useStore(state => state.time);
  const timezone = useTimezone();
  const comparisonEnabled = useComparisonEnabled();
  const [breakdown, setBreakdown] = useState<EventsBreakdown>("type");
  const [eventLimit, setEventLimit] = useState(5);

  const trendBucket = trendBucketFor(time, timezone);
  const stats = useGetEventNameStats({ trendBucket });
  const previousNamesQuery = useGetEventNames({ periodTime: "previous" });
  // A disabled query keeps its last result, so the switch is read here.
  const previousNames = comparisonEnabled ? previousNamesQuery.data : undefined;
  const { data: silentEvents } = useGetSilentEvents();

  const rows = buildEventNameRows(stats.data, previousNames, timezone);
  const silentNames = new Set((silentEvents ?? []).map(event => event.eventName));

  return (
    <DisabledOverlay message={t("Events")} featurePath="events">
      <div className="mx-auto max-w-[1400px] space-y-3 p-2 md:p-4">
        <SubHeader availableFilters={EVENT_FILTERS} />
        <EventsStatBand newEventNames={countNewEventNames(stats.data, previousNames)} />
        <AnalysisBar
          breakdown={
            <BreakdownControl<EventsBreakdown>
              value={breakdown}
              onChange={setBreakdown}
              options={[
                { value: "type", label: t("Event type") },
                { value: "name", label: t("Event name") },
              ]}
            />
          }
          end={<BucketSelection />}
        >
          {breakdown === "name" && (
            <Select value={String(eventLimit)} onValueChange={value => setEventLimit(Number(value))}>
              <SelectTrigger className="w-[90px]" size="sm" aria-label={t("Events on the chart")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent size="sm">
                {EVENT_LIMIT_OPTIONS.map(option => (
                  <SelectItem key={option} value={String(option)} size="sm">
                    {t("Top {option}", { option: String(option) })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </AnalysisBar>
        <EventsChart breakdown={breakdown} eventLimit={eventLimit} />
        <SilentEventNotice events={silentEvents} />
        <EventNamesCard
          rows={rows}
          isLoading={stats.isPending}
          isError={stats.isError}
          trendBucket={trendBucket}
          silentEvents={silentNames}
        />
        <EventLog />
      </div>
    </DisabledOverlay>
  );
}
