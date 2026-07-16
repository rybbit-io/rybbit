import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { fetchGSCConnectionStatus } from "../endpoints";

/**
 * Hook to check if the current site has a GSC connection
 */
export function useGetGSCConnection(options?: { site?: number | string }) {
  const { site: storeSite } = useStore();
  const site = options?.site ?? storeSite;

  return useQuery({
    queryKey: ["gsc-status", site],
    queryFn: () => fetchGSCConnectionStatus(site!),
    enabled: !!site,
  });
}
