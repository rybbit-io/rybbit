import { useQuery } from "@tanstack/react-query";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchOutboundLinks } from "../../endpoints";

export function useGetOutboundLinks() {
  const { site, time, timezone } = useStore();

  const filteredFilters = getFilteredFilters(EVENT_FILTERS);
  const params = buildApiParams(time, {
    filters: filteredFilters.length > 0 ? filteredFilters : undefined,
  });

  return useQuery({
    queryKey: ["outbound-links", site, time, filteredFilters, timezone],
    enabled: !!site,
    queryFn: () => fetchOutboundLinks(site, params),
  });
}
