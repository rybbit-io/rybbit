import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { fetchSiteEventCount, type SiteEventCountParams, type SiteEventCountPoint } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetSiteEventCount() {
  const { bucket } = useStore();
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<SiteEventCountPoint[], SiteEventCountParams>({
    key: "site-event-count",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: { bucket },
    fetch: (site, params) => fetchSiteEventCount(site, params),
  });
}
