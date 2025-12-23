import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "../../lib/store";
import { authedFetch } from "../utils";

export type GSCConnectionStatus = {
  connected: boolean;
  gscPropertyUrl: string | null;
};

/**
 * Hook to check if the current site has a GSC connection
 */
export function useGSCConnection() {
  const { site } = useStore();

  return useQuery({
    queryKey: ["gsc-status", site],
    enabled: !!site,
    queryFn: () => {
      return authedFetch<GSCConnectionStatus>(`/gsc/status/${site}`);
    },
  });
}

/**
 * Hook to initiate GSC connection (get OAuth URL)
 */
export function useConnectGSC() {
  const { site } = useStore();

  return useMutation({
    mutationFn: async () => {
      const response = await authedFetch<{ authUrl: string }>(`/gsc/connect/${site}`);
      // Redirect to Google OAuth
      window.location.href = response.authUrl;
      return response;
    },
  });
}

/**
 * Hook to disconnect GSC from a site
 */
export function useDisconnectGSC() {
  const { site } = useStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return authedFetch<{ success: boolean }>(`/gsc/disconnect/${site}`, undefined, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      // Invalidate connection status query
      queryClient.invalidateQueries({ queryKey: ["gsc-status", site] });
      // Invalidate data queries
      queryClient.invalidateQueries({ queryKey: ["gsc-queries", site] });
      queryClient.invalidateQueries({ queryKey: ["gsc-pages", site] });
    },
  });
}

/**
 * Standalone fetch function for GSC connection status (used for exports)
 */
export async function fetchGSCConnectionStatus(
  site: number | string
): Promise<GSCConnectionStatus> {
  return authedFetch<GSCConnectionStatus>(`/gsc/status/${site}`);
}
