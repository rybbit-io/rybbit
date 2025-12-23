import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import { fetchSessionLocations, LiveSessionLocation } from "../endpoints";

export function useGetSessionLocations() {
  const { time, site, filters, timezone } = useStore();

  // Filter out location-related filters to avoid circular dependencies
  const locationExcludedFilters = filters.filter(
    f =>
      f.parameter !== "lat" &&
      f.parameter !== "lon" &&
      f.parameter !== "city" &&
      f.parameter !== "country" &&
      f.parameter !== "region"
  );

  const params = buildApiParams(time, { filters: locationExcludedFilters });

  return useQuery<LiveSessionLocation[]>({
    queryKey: ["session-locations", site, time, locationExcludedFilters, timezone],
    queryFn: () => {
      return fetchSessionLocations(site, params);
    },
    enabled: !!site,
  });
}
