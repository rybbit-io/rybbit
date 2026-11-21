import { SilentEvent } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

// Custom events that fired on most days and then stopped. A statement about
// the site right now: it ignores the selected period and filters, so it does
// not refetch when either changes.
export function useGetSilentEvents() {
  return useAnalyticsQuery<SilentEvent[]>({
    key: "silent-events",
    path: "events/silent",
    useTime: false,
    useFilters: false,
    staleTime: 5 * 60_000,
  });
}
