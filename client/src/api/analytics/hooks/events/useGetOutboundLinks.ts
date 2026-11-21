import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { OutboundLink } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetOutboundLinks() {
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<OutboundLink[]>({
    key: "outbound-links",
    path: "events/outbound",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
  });
}
