import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { disconnectGSC } from "../endpoints";

/**
 * Hook to disconnect GSC from a site
 */
export function useDisconnectGSC() {
  const queryClient = useQueryClient();
  const { site } = useStore();

  return useMutation({
    mutationFn: async () => {
      return disconnectGSC(site);
    },
    onSuccess: () => {
      // Invalidate connection status query
      queryClient.invalidateQueries({ queryKey: ["gsc-status", site] });
      // Invalidate all data queries
      queryClient.invalidateQueries({ queryKey: ["gsc-data"] });
    },
  });
}
