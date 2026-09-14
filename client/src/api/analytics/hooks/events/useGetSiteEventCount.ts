import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { type SiteEventCountPoint } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetSiteEventCount() {
  const bucket = useStore(state => state.bucket);
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<SiteEventCountPoint[]>({
    key: "site-event-count",
    path: "events/count",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { bucket },
  });
}
