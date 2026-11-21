import { SavedFunnel } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetFunnels(siteId?: string | number) {
  return useAnalyticsQuery<SavedFunnel[]>({
    key: "funnels",
    path: "funnels",
    site: siteId,
    // The saved funnel list is not scoped to the selected period.
    useTime: false,
    useFilters: false,
    staleTime: 0,
    placeholder: false,
  });
}
