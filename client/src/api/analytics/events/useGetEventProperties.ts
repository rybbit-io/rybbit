import { useQuery } from "@tanstack/react-query";
import { getFilteredFilters, useStore } from "../../../lib/store";
import { EVENT_FILTERS } from "../../../lib/filterGroups";
import { authedFetch, getQueryParams } from "../../utils";

export type EventProperty = {
  propertyKey: string;
  propertyValue: string;
  count: number;
};

export function useGetEventProperties(eventName: string | null) {
  const { site, time, filters } = useStore();

  const timeParams = getQueryParams(time);
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useQuery({
    queryKey: ["event-properties", site, eventName, timeParams, filteredFilters],
    enabled: !!site && !!eventName,
    queryFn: () => {
      const params = {
        ...timeParams,
        event_name: eventName,
        filters: filteredFilters.length > 0 ? filteredFilters : undefined,
      };

      return authedFetch<{ data: EventProperty[] }>(`/events/properties/${site}`, params).then(res => res.data);
    },
  });
}
