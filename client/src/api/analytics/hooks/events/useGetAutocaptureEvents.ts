import { AutocaptureTargetType } from "../../../../lib/events";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { type AutocaptureEvent } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetAutocaptureEvents(type: AutocaptureTargetType) {
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<AutocaptureEvent[]>({
    key: "autocapture-events",
    path: "events/autocapture",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { type },
  });
}
