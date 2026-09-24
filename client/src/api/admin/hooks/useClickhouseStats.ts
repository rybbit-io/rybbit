import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getClickhouseStats,
  getClickhouseQueryLog,
  ClickhouseStatsResponse,
  ClickhouseQueryLogResponse,
  QueryLogParams,
} from "../endpoints/clickhouseStats";

export function useClickhouseStats(days?: number) {
  return useQuery<ClickhouseStatsResponse>({
    queryKey: ["clickhouse-stats", days],
    queryFn: () => getClickhouseStats(days),
    placeholderData: keepPreviousData,
    refetchInterval: 60000, // 60 seconds
  });
}

export function useClickhouseQueryLog(params: QueryLogParams = {}) {
  return useQuery<ClickhouseQueryLogResponse>({
    queryKey: ["clickhouse-query-log", params],
    queryFn: () => getClickhouseQueryLog(params),
    placeholderData: keepPreviousData,
  });
}
