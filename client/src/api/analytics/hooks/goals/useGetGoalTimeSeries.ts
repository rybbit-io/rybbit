import { useQuery } from "@tanstack/react-query";
import { TimeBucket } from "@rybbit/shared";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchGoalTimeSeries } from "../../endpoints";

export function useGetGoalTimeSeries({ goalIds, bucket }: { goalIds: number[]; bucket?: TimeBucket }) {
  const { site, time, bucket: storeBucket, timezone } = useStore();
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);
  const bucketToUse = bucket || storeBucket;
  const params = buildApiParams(time, { filters: filteredFilters });

  return useQuery({
    queryKey: ["goal-time-series", site, time, bucketToUse, filteredFilters, goalIds, timezone],
    queryFn: async () => {
      return fetchGoalTimeSeries(site, {
        ...params,
        bucket: bucketToUse,
        goalIds,
      });
    },
    enabled: !!site && goalIds.length > 0,
  });
}
