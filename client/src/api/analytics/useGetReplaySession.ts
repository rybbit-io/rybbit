import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../../lib/const";
import { useStore } from "../../lib/store";
import { authedFetchWithError } from "../utils";

export type ReplayEvent = {
  event_type: string;
  event_data: string;
  sequence_number: number;
  timestamp: string;
};

export type ReplaySessionMetadata = {
  session_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  event_count: number;
  compressed_size_bytes: number;
  page_url: string;
  user_agent: string;
  created_at: string;
};

export interface ReplaySessionResponse {
  metadata: ReplaySessionMetadata;
  events: ReplayEvent[];
}

export function useGetReplaySession(sessionId: string) {
  const { site } = useStore();

  return useQuery<ReplaySessionResponse, Error>({
    queryKey: ["replay-session", site, sessionId],
    queryFn: async () => {
      const response = await authedFetchWithError<ReplaySessionResponse>(
        `${BACKEND_URL}/replay/session/${site}/${sessionId}`
      );
      return response;
    },
    enabled: !!site && !!sessionId,
  });
}
