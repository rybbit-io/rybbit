import { useQuery } from "@tanstack/react-query";
import { AutocaptureTargetType } from "../../../../lib/events";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchAutocaptureEvents } from "../../endpoints";

export function useGetAutocaptureEvents(type: AutocaptureTargetType) {
  const { site, time, timezone } = useStore();

  const filteredFilters = getFilteredFilters(EVENT_FILTERS);
  const params = buildApiParams(time, {
    filters: filteredFilters.length > 0 ? filteredFilters : undefined,
  });

  return useQuery({
    queryKey: ["autocapture-events", site, type, time, filteredFilters, timezone],
    enabled: !!site,
    queryFn: () => fetchAutocaptureEvents(site, { ...params, type }),
  });
}
