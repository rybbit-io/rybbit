import { useQuery } from "@tanstack/react-query";
import { GOALS_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchGoals } from "../../endpoints";

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
  const { site, time, timezone } = useStore();
  const filteredFilters = getFilteredFilters(GOALS_PAGE_FILTERS);

  const params = buildApiParams(time, { filters: filteredFilters });

  return useQuery({
    queryKey: ["goals", site, time, filteredFilters, page, pageSize, sort, order, timezone],
    queryFn: async () => {
      return fetchGoals(site, {
        ...params,
        page,
        pageSize,
        sort,
        order,
      });
    },
    enabled: !!site,
  });
}
