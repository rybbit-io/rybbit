import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { fetchClickHeatmap, ViewportBreakpoint } from "../../endpoints/heatmap";

interface UseGetClickHeatmapOptions {
  pathname: string;
  viewportBreakpoint?: ViewportBreakpoint;
  gridResolution?: number;
  enabled?: boolean;
}

export function useGetClickHeatmap({
  pathname,
  viewportBreakpoint = "all",
  gridResolution = 100,
  enabled = true,
}: UseGetClickHeatmapOptions) {
  const { time, site, filters, timezone } = useStore();
  const params = buildApiParams(time, { filters });

  return useQuery({
    queryKey: ["click-heatmap", site, pathname, viewportBreakpoint, gridResolution, time, filters, timezone],
    queryFn: () =>
      fetchClickHeatmap(site, {
        ...params,
        pathname,
        viewportBreakpoint,
        gridResolution,
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!site && !!pathname && enabled,
  });
}
