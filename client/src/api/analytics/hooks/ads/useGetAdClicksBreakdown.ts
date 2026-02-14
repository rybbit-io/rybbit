import { useQuery } from "@tanstack/react-query";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchAdClicksBreakdown } from "../../endpoints/ads";

export function useGetAdClicksBreakdown(parameter: string) {
  const { site, time, timezone } = useStore();

  const filteredFilters = getFilteredFilters(EVENT_FILTERS);
  const params = buildApiParams(time, {
    filters: filteredFilters.length > 0 ? filteredFilters : undefined,
  });

  return useQuery({
    queryKey: ["ad-clicks-breakdown", site, parameter, time, filteredFilters, timezone],
    enabled: !!site,
    queryFn: () =>
      fetchAdClicksBreakdown(site, {
        ...params,
        parameter,
      }),
  });
}
