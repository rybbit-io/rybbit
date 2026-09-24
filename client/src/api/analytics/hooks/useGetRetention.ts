import { ProcessedRetentionData, RetentionMode } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

export function useGetRetention(mode: RetentionMode = "week", range: number = 90) {
  return useAnalyticsQuery<ProcessedRetentionData>({
    key: "retention",
    path: "retention",
    // Retention spans its own cohort range, not the selected period.
    useTime: false,
    useFilters: false,
    params: { mode, range },
    // Keyed by mode/range: refetch on mount and don't show the previous
    // cohort grid while the new one loads.
    staleTime: 0,
    placeholder: false,
  });
}
