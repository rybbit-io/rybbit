import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { EventsOverview } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetEventsOverview({ periodTime }: { periodTime?: "current" | "previous" } = {}) {
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<EventsOverview>({
    key: "events-overview",
    path: "events/overview",
    periodTime,
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
  });
}
