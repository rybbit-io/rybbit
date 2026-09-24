import { useMutation } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { connectGSC } from "../endpoints";

/**
 * Hook to initiate GSC connection (get OAuth URL)
 */
export function useConnectGSC(siteOverride?: string | number) {
  const { site: storeSite } = useStore();
  const site = siteOverride ?? storeSite;

  return useMutation({
    mutationFn: async () => {
      const response = await connectGSC(site!);
      // Redirect to Google OAuth
      window.location.href = response.authUrl;
      return response;
    },
  });
}
