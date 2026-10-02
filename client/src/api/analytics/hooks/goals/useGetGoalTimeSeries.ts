import { TimeBucket } from "@rybbit/shared";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { GoalTimeSeriesPoint } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetGoalTimeSeries({
  goalIds,
  bucket,
  periodTime,
  enabled = true,
}: {
  goalIds: number[];
  bucket?: TimeBucket;
  /** "previous" asks for the comparison period; the query stops when comparison is off. */
  periodTime?: "current" | "previous";
  enabled?: boolean;
}) {
  const storeBucket = useStore(state => state.bucket);
  // Only the goals page's filter parameters apply; an empty subset means no
  // filters at all (not the store's full filter list).
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  return useAnalyticsQuery<GoalTimeSeriesPoint[]>({
    key: "goal-time-series",
    path: "goals/time-series",
    periodTime,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { bucket: bucket || storeBucket, goal_ids: goalIds },
    enabled: enabled && goalIds.length > 0,
  });
}
