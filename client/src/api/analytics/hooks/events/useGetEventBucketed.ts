import { EVENT_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { type EventBucketedPoint } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetEventBucketed({ limit = 5 }: { limit?: number } = {}) {
  const bucket = useStore(state => state.bucket);
  const filteredFilters = getFilteredFilters(EVENT_FILTERS);

  return useAnalyticsQuery<EventBucketedPoint[]>({
    key: "event-bucketed",
    path: "events/time-series",
    // Only event-relevant filters go on the wire; when none apply, send no filters.
    useFilters: filteredFilters.length > 0,
    customFilters: filteredFilters,
    params: { bucket, limit },
  });
}
