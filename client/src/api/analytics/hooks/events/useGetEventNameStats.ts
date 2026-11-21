import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { EventNameStats, EventTrendBucket } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

// Every custom event name in the period with its count, users, last occurrence
// and trend: one request for the whole table.
export function useGetEventNameStats({ trendBucket }: { trendBucket: EventTrendBucket }) {
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<EventNameStats>({
    key: "event-name-stats",
    path: "events/names/stats",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { trend_bucket: trendBucket },
  });
}
