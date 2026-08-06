import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { fetchGoals, GoalsParams, GoalsResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetGoals({
  page = 1,
  pageSize = 10,
  sort = "createdAt",
  order = "desc",
}: {
  page?: number;
  pageSize?: number;
  sort?: "goalId" | "name" | "goalType" | "createdAt";
  order?: "asc" | "desc";
}) {
  // Only the goals page's filter parameters apply; an empty subset means no
  // filters at all (not the store's full filter list).
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  return useAnalyticsQuery<GoalsResponse, GoalsParams>({
    key: "goals",
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: { page, pageSize, sort, order },
    fetch: (site, params) => fetchGoals(site, params),
  });
}
