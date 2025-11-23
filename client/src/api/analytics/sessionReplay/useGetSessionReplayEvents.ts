import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../../utils";

export interface SessionReplayEvent {
  timestamp: number;
  type: string | number;
  data: any;
}

export interface SessionReplayMetadata {
  session_id: string;
  user_id: string;
  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  event_count: number;
  compressed_size_bytes: number;
  page_url: string;
  user_agent: string;
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  language: string;
  screen_width: number;
  screen_height: number;
  device_type: string;
  channel: string;
  hostname: string;
  referrer: string;
  has_replay_data: boolean;
  created_at: Date;
}

export interface GetSessionReplayEventsResponse {
  events: SessionReplayEvent[];
  metadata: SessionReplayMetadata;
}

export function useGetSessionReplayEvents(siteId: number, sessionId: string) {
  return useQuery({
    queryKey: ["session-replay-events", siteId, sessionId],
    queryFn: () => {
      return authedFetch<GetSessionReplayEventsResponse>(`/session-replay/${sessionId}/${siteId}`);
    },
    enabled: !!siteId && !!sessionId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
