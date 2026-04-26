import { TimeBucket } from "@rybbit/shared";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { buildApiParams } from "../../utils";
import { fetchOverviewBucketedLite, fetchOverviewLite } from "../endpoints";

// Lite hooks back the simplified high-traffic dashboard. They never apply
// filters and they read MV-backed endpoints. Use only when configs.liteDashboard
// is true — the lite endpoints don't exist on deployments where the flag is off.

export function useGetOverviewLite(site?: number | string) {
  const { time, timezone } = useStore();
  const params = buildApiParams(time);

  return useQuery({
    queryKey: ["overview-lite", time, site, timezone],
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
  const { time, timezone } = useStore();
  const params = buildApiParams(time);

  return useQuery({
    queryKey: ["overview-bucketed-lite", time, bucket, site, timezone],
    queryFn: () => fetchOverviewBucketedLite(site, { ...params, bucket }).then(data => ({ data })),
    staleTime: 60_000,
    enabled: !!site,
  });
}
