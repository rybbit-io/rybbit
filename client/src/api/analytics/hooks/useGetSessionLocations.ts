import { useStore } from "../../../lib/store";
import { fetchSessionLocations, LiveSessionLocation } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

export function useGetSessionLocations() {
  const { filters } = useStore();

  // Filter out location-related filters to avoid circular dependencies
  const locationExcludedFilters = filters.filter(
    f =>
      f.parameter !== "lat" &&
      f.parameter !== "lon" &&
      f.parameter !== "city" &&
      f.parameter !== "country" &&
      f.parameter !== "region"
  );

  return useAnalyticsQuery<LiveSessionLocation[]>({
    key: "session-locations",
    // customFilters fall back to the store filters when empty; disable filters
    // entirely instead so the excluded location filters stay excluded.
    useFilters: locationExcludedFilters.length > 0,
    customFilters: locationExcludedFilters,
    fetch: (site, params) => fetchSessionLocations(site, params),
  });
}
