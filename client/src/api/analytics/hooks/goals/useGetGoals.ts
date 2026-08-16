import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters } from "../../../../lib/store";
import { GoalsResponse } from "../../endpoints";
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

  return useAnalyticsQuery<GoalsResponse>({
    key: "goals",
    path: "goals",
    unwrap: false,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { page, page_size: pageSize, sort, order },
  });
}
