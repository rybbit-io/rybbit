import { useQuery } from "@tanstack/react-query";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchAdsBreakdown } from "../../endpoints/ads";

export function useGetAdsBreakdown(
  parameter: string,
  type: "ad_click" | "ad_impression" = "ad_click"
) {
  const { site, time, timezone } = useStore();

  const filteredFilters = getFilteredFilters(EVENT_FILTERS);
  const params = buildApiParams(time, {
    filters: filteredFilters.length > 0 ? filteredFilters : undefined,
  });

  return useQuery({
    queryKey: ["ads-breakdown", site, parameter, type, time, filteredFilters, timezone],
    enabled: !!site,
    queryFn: () =>
      fetchAdsBreakdown(site, {
        ...params,
        parameter,
        type,
      }),
  });
}
