import { useMutation } from "@tanstack/react-query";
import { useStore } from "../../../lib/store";
import { connectGSC } from "../endpoints";

/**
 * Hook to initiate GSC connection (get OAuth URL)
 */
export function useConnectGSC() {
  const { site } = useStore();

  return useMutation({
    mutationFn: async () => {
      const response = await connectGSC(site);
      // Redirect to Google OAuth
      window.location.href = response.authUrl;
      return response;
    },
  });
}
