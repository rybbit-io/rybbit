import { ProcessedRetentionData, RetentionMode } from "../endpoints";
import { useAnalyticsQuery } from "../useAnalyticsQuery";

/**
 * Cohort retention for the selected period and filters. `periodTime:
 * "previous"` asks for the comparison period instead, and is disabled while
 * the comparison is off.
 */
export function useGetRetention(
  mode: RetentionMode,
  options: { periodTime?: "current" | "previous"; enabled?: boolean } = {}
) {
  return useAnalyticsQuery<ProcessedRetentionData>({
    key: "retention",
    path: "retention",
    params: { mode },
    periodTime: options.periodTime,
    enabled: options.enabled,
    // A new mode or range changes the grid's shape, so the old grid is not
    // kept on screen while the new one loads.
    placeholder: false,
  });
}
