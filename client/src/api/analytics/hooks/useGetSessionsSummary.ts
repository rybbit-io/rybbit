import { SESSION_PAGE_FILTERS } from "../../../lib/filterGroups";
import { getFilteredFilters } from "../../../lib/store";
import { SessionsSummary } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

/**
 * The Sessions page's numbers for one period: the stat band's figures, how
 * many sessions each saved view holds once the ranges are applied, and the
 * same counts per day. It takes the filters the sessions list takes, so its
 * totals are totals of that list.
 *
 * `periodTime: "previous"` asks for the comparison period and stops running
 * when the comparison is turned off.
 */
export function useGetSessionsSummary({
  periodTime,
  minPageviews,
  maxPageviews,
  minEvents,
  maxEvents,
  minDuration,
  maxDuration,
}: {
  periodTime?: "current" | "previous";
  minPageviews?: number;
  maxPageviews?: number;
  minEvents?: number;
  maxEvents?: number;
  minDuration?: number;
  maxDuration?: number;
} = {}) {
  const filteredFilters = getFilteredFilters(SESSION_PAGE_FILTERS);

  return useAnalyticsQuery<SessionsSummary>({
    key: "sessions-summary",
    path: "sessions/summary",
    periodTime,
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so an empty page-filter set stays unfiltered.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: {
      min_pageviews: minPageviews,
      max_pageviews: maxPageviews,
      min_events: minEvents,
      max_events: maxEvents,
      min_duration: minDuration,
      max_duration: maxDuration,
    },
    // As long-lived as the sessions list, so the totals stay those of the rows on screen.
    staleTime: Infinity,
  });
}
