import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { useStore } from "../../../../lib/store";
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
  const filters = useStore(state => state.filters);
  const filteredFilters = filters.filter(filter => GOALS_PAGE_FILTERS.includes(filter.parameter));

  return useAnalyticsQuery<GoalsResponse>({
    key: "goals",
    path: "goals",
    unwrap: false,
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { page, page_size: pageSize, sort, order },
  });
}
