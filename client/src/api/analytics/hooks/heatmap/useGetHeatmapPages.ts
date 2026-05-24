import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchHeatmapPages } from "../../endpoints/heatmap";

interface UseGetHeatmapPagesOptions {
  limit?: number;
  enabled?: boolean;
}

export function useGetHeatmapPages({ limit = 100, enabled = true }: UseGetHeatmapPagesOptions = {}) {
  const { time, site, filters, timezone } = useStore();
  const params = buildApiParams(time, { filters });

  return useQuery({
    queryKey: ["heatmap-pages", site, limit, time, filters, timezone],
    queryFn: () =>
      fetchHeatmapPages(site, {
        ...params,
        limit,
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!site && enabled,
  });
}
