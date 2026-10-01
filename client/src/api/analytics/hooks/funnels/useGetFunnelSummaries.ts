import { FUNNEL_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { FunnelSummariesResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

/**
 * Step counts and step-to-step medians for every saved funnel of the site, in
 * one request per period. `periodTime: "previous"` asks about the comparison
 * period and stays idle while the comparison is off.
 */
export function useGetFunnelSummaries({ periodTime }: { periodTime?: "current" | "previous" } = {}) {
  // Only the funnel page's filter parameters apply; an empty subset means no
  // filters at all (not the store's full filter list).
  const filteredFilters = getFilteredFilters(FUNNEL_PAGE_FILTERS);

  return useAnalyticsQuery<FunnelSummariesResponse>({
    // Same prefix as the saved funnel list, so saving or deleting a funnel
    // refreshes its numbers along with its definition.
    key: "funnels",
    path: "funnels/summary",
    periodTime,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
  });
}
