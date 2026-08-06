import { AutocaptureTargetType } from "../../../../lib/events";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { type AutocaptureEvent, fetchAutocaptureEvents } from "../../endpoints";
import { CommonApiParams } from "../../endpoints/types";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetAutocaptureEvents(type: AutocaptureTargetType) {
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<AutocaptureEvent[], CommonApiParams & { type: string }>({
    key: "autocapture-events",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: { type },
    fetch: (site, params) => fetchAutocaptureEvents(site, params),
  });
}
