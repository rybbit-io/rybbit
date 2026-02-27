import { useQuery } from "@tanstack/react-query";
import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, getTimezone, useStore } from "../../../../lib/store";
import { getStartAndEndDate } from "../../../utils";
import { fetchEventProperties } from "../../endpoints";

export function useGetEventProperties(eventName: string | null) {
  const { site, time, timezone } = useStore();

  const filteredFilters = getFilteredFilters(EVENT_FILTERS);
  const { startDate, endDate } = getStartAndEndDate(time);

  return useQuery({
    queryKey: ["event-properties", site, eventName, time, filteredFilters, timezone],
    enabled: !!site && !!eventName,
    queryFn: () => {
      return fetchEventProperties(site, {
        startDate: startDate ?? "",
        endDate: endDate ?? "",
        timeZone: getTimezone(),
        filters: filteredFilters.length > 0 ? filteredFilters : undefined,
        eventName: eventName!,
      });
    },
  });
}
