import { useQuery } from "@tanstack/react-query";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchEventNames } from "../../endpoints";

export function useGetEventNames() {
  const { site, time, timezone } = useStore();

  const filteredFilters = getFilteredFilters(EVENT_FILTERS);
  const params = buildApiParams(time, {
    filters: filteredFilters.length > 0 ? filteredFilters : undefined,
  });

  return useQuery({
    queryKey: ["event-names", site, time, filteredFilters, timezone],
    enabled: !!site,
    queryFn: () => fetchEventNames(site, params),
  });
}
