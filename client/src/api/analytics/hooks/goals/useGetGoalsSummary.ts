import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { GoalsSummary } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

/**
 * Every goal with its conversions, and the sessions that completed at least
 * one. `periodTime: "previous"` asks the same question of the comparison
 * period and stops when comparison is turned off.
 */
export function useGetGoalsSummary({ periodTime }: { periodTime?: "current" | "previous" } = {}) {
  // Only the goals page's filter parameters apply; an empty subset means no
  // filters at all (not the store's full filter list).
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  return useAnalyticsQuery<GoalsSummary>({
    key: "goals-summary",
    path: "goals/summary",
    periodTime,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
  });
}
