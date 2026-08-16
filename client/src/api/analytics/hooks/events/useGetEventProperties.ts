import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { EventProperty } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetEventProperties(eventName: string | null) {
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<EventProperty[]>({
    key: "event-properties",
    path: "events/properties",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { event_name: eventName },
    enabled: !!eventName,
    // Keyed by event name: never show the previously selected event's
    // properties while the new one loads.
    staleTime: 0,
    placeholder: false,
  });
}
