import { TimeBucket } from "@rybbit/shared";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { fetchGoalTimeSeries, GoalTimeSeriesParams, GoalTimeSeriesPoint } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetGoalTimeSeries({ goalIds, bucket }: { goalIds: number[]; bucket?: TimeBucket }) {
  const { bucket: storeBucket } = useStore();
  const bucketToUse = bucket || storeBucket;
  // Only the goals page's filter parameters apply; an empty subset means no
  // filters at all (not the store's full filter list).
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  return useAnalyticsQuery<GoalTimeSeriesPoint[], GoalTimeSeriesParams>({
    key: "goal-time-series",
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: { bucket: bucketToUse, goalIds },
    enabled: goalIds.length > 0,
    fetch: (site, params) => fetchGoalTimeSeries(site, params),
  });
}
