import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { fetchOutboundLinks } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetOutboundLinks() {
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery({
    key: "outbound-links",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    fetch: (site, params) => fetchOutboundLinks(site, params),
  });
}
