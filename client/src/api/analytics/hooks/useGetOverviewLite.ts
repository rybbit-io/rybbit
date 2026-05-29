import { TimeBucket } from "@rybbit/shared";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import { fetchOverviewBucketedLite, fetchOverviewLite } from "../endpoints";

// Lite hooks back the simplified high-traffic dashboard and read MV-backed
// endpoints. Use only when configs.liteDashboard is true — the lite endpoints
// don't exist on deployments where the flag is off. Filters are forwarded: the
// server serves the MV fast path when there are none and falls back to raw
// events when a filter is active.

export function useGetOverviewLite(site?: number | string) {
  const { time, timezone, filters } = useStore();
  const params = buildApiParams(time, { filters });

  return useQuery({
    queryKey: ["overview-lite", time, site, timezone, filters],
    queryFn: () => fetchOverviewLite(site!, params).then(data => ({ data })),
    staleTime: 60_000,
    enabled: !!site,
  });
}

export function useGetOverviewBucketedLite({
  site,
  bucket = "hour",
}: {
  site: number | string;
  bucket?: TimeBucket;
}) {
  const { time, timezone, filters } = useStore();
  const params = buildApiParams(time, { filters });

  return useQuery({
    queryKey: ["overview-bucketed-lite", time, bucket, site, timezone, filters],
    queryFn: () => fetchOverviewBucketedLite(site, { ...params, bucket }).then(data => ({ data })),
    staleTime: 60_000,
    enabled: !!site,
  });
}
