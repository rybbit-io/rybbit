import { GetSessionReplayEventsResponse } from "../../endpoints";
import { useAnalyticsQuery } from "../../useAnalyticsQuery";

export function useGetSessionReplayEvents(siteId: number, sessionId: string) {
  return useAnalyticsQuery<GetSessionReplayEventsResponse>({
    key: ["session-replay-events", sessionId],
    path: `session-replay/${sessionId}`,
    unwrap: false,
    site: siteId,
    useTime: false,
    useFilters: false,
    enabled: !!sessionId,
    // Keyed by session: never play the previous replay's events.
    placeholder: false,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
