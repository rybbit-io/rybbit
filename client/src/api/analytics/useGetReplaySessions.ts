import { useQuery } from "@tanstack/react-query";
import { Time } from "../../components/DateSelector/types";
import { BACKEND_URL } from "../../lib/const";
import { useStore } from "../../lib/store";
import { authedFetchWithError, buildUrl, getStartAndEndDate } from "../utils";

export type ReplaySession = {
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

export interface ReplaySessionsResponse {
  sessions: ReplaySession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetReplaySessionsOptions {
  time?: Time;
  page?: number;
  limit?: number;
  user_id?: string;
}

export function useGetReplaySessions(options: GetReplaySessionsOptions = {}) {
  const { site, time } = useStore();
  const { startDate, endDate } = options.time
    ? getStartAndEndDate(options.time)
    : getStartAndEndDate(time);

  const page = options.page || 1;
  const limit = options.limit || 20;

  return useQuery<ReplaySessionsResponse, Error>({
    queryKey: [
      "replay-sessions",
      site,
      startDate,
      endDate,
      page,
      limit,
      options.user_id,
    ],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
      };

      if (startDate) {
        params.start_date = startDate;
      }
      if (endDate) {
        params.end_date = endDate;
      }
      if (options.user_id) {
        params.user_id = options.user_id;
      }

      const url = buildUrl(`${BACKEND_URL}/replay/sessions/${site}`, params);
      const response = await authedFetchWithError<ReplaySessionsResponse>(url);
      return response;
    },
    enabled: !!site,
  });
}
