import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { type EventBucketedParams, type EventBucketedPoint, fetchEventBucketed } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetEventBucketed({ limit = 5 }: { limit?: number } = {}) {
  const { bucket } = useStore();
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<EventBucketedPoint[], EventBucketedParams>({
    key: "event-bucketed",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    extraParams: { bucket, limit },
    fetch: (site, params) => fetchEventBucketed(site, params),
  });
}
