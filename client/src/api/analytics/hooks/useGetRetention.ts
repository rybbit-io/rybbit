import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { fetchRetention, ProcessedRetentionData, RetentionMode } from "../endpoints";

export function useGetRetention(mode: RetentionMode = "week", range: number = 90) {
  const { site } = useStore();
  return useQuery<ProcessedRetentionData>({
    queryKey: ["retention", site, mode, range],
    queryFn: () => fetchRetention(site, { mode, range }),
    enabled: !!site,
  });
}
