import { GoalsResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

// The goals endpoint's largest page.
const MAX_GOALS = 100;

/**
 * The site's goals, for linking a funnel's last step to the goal that measures
 * the same thing. Only the definitions are read, so no filters are sent.
 */
export function useGetFunnelGoals({ enabled = true }: { enabled?: boolean } = {}) {
  return useAnalyticsQuery<GoalsResponse>({
    // Same prefix as the goals list, so creating or editing a goal refreshes this too.
    key: "goals",
    path: "goals",
    unwrap: false,
    useFilters: false,
    params: { page: 1, page_size: MAX_GOALS, sort: "createdAt", order: "desc" },
    enabled,
  });
}
