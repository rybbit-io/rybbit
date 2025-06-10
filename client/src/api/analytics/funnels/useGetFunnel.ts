import { Filter } from "@rybbit/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { timeZone } from "../../../lib/dateTimeUtils";
import { useStore } from "../../../lib/store";
import { authedFetch } from "../../utils";

export type FunnelStep = {
  value: string;
  name?: string;
  type: "page" | "event";
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
};

export type FunnelRequest = {
  steps: FunnelStep[];
  startDate: string | null;
  endDate: string | null;
  name?: string;
  filters?: Filter[];
};

export type SaveFunnelRequest = {
  steps: FunnelStep[];
  startDate: string;
  endDate: string;
  name: string;
  reportId?: number;
  filters?: Filter[];
};

export type FunnelResponse = {
  step_number: number;
  step_name: string;
  visitors: number;
  conversion_rate: number;
  dropoff_rate: number;
};

/**
 * Hook for analyzing conversion funnels through a series of steps
 */
export function useGetFunnel(config?: FunnelRequest, debounce?: boolean) {
  const { site } = useStore();

  const debouncedConfig = useDebounce(config, 500);

  const configToUse = debounce ? debouncedConfig : config;

  return useQuery<FunnelResponse[], Error>({
    queryKey: [
      "funnel",
      site,
      configToUse?.filters,
      configToUse?.startDate,
      configToUse?.endDate,
      configToUse?.filters,
      configToUse?.steps.map((s) => s.value + s.type),
    ],
    queryFn: async () => {
      if (!configToUse) {
        throw new Error("Funnel configuration is required");
      }

      // Add time zone to the request
      const fullConfig = {
        ...configToUse,
        timeZone,
      };
      try {
        const response = await authedFetch<{ data: FunnelResponse[] }>(
          `/funnel/${site}`,
          undefined,
          {
            method: "POST",
            data: fullConfig,
          }
        );

        return response.data;
      } catch (error) {
        throw new Error("Failed to analyze funnel");
      }
    },
    enabled: !!site && !!configToUse,
  });
}

/**
 * Hook for saving funnel configurations without analyzing them
 */
export function useSaveFunnel() {
  const { site } = useStore();
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; funnelId: number },
    Error,
    SaveFunnelRequest
  >({
    mutationFn: async (funnelConfig) => {
      // Add time zone to the request
      const fullConfig = {
        ...funnelConfig,
        timeZone,
      };

      try {
        // Save the funnel configuration
        const saveResponse = await authedFetch<{
          success: boolean;
          funnelId: number;
        }>(`/funnel/create/${site}`, undefined, {
          method: "POST",
          data: fullConfig,
        });

        // Invalidate the funnels query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["funnels", site] });

        return saveResponse;
      } catch (error) {
        throw new Error("Failed to save funnel");
      }
    },
  });
}
