import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { fetchEventNames } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetEventNames() {
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery({
    key: "event-names",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    fetch: (site, params) => fetchEventNames(site, params),
  });
}
