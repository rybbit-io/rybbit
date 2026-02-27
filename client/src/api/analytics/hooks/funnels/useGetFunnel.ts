import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { FUNNEL_PAGE_FILTERS } from "../../../../lib/filterGroups";
import { getFilteredFilters, useStore } from "../../../../lib/store";
import { buildApiParams } from "../../../utils";
import { analyzeFunnel, FunnelRequest, FunnelResponse, saveFunnel, SaveFunnelRequest } from "../../endpoints";

/**
 * Hook for analyzing conversion funnels through a series of steps
 */
export function useGetFunnel(config?: FunnelRequest, debounce?: boolean) {
  const { site, time, timezone } = useStore();

  const debouncedConfig = useDebounce(config, 500);
  const filteredFilters = getFilteredFilters(FUNNEL_PAGE_FILTERS);
  const params = buildApiParams(time, { filters: filteredFilters });

  const configToUse = debounce ? debouncedConfig : config;

  return useQuery<FunnelResponse[], Error>({
    queryKey: ["funnel", site, time, filteredFilters, configToUse?.steps, timezone],
    queryFn: async () => {
      if (!configToUse) {
        throw new Error("Funnel configuration is required");
      }

      return analyzeFunnel(site, {
        ...params,
        steps: configToUse.steps,
        name: configToUse.name,
      });
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

  return useMutation<{ success: boolean; funnelId: number }, Error, SaveFunnelRequest>({
    mutationFn: async funnelConfig => {
      try {
        const saveResponse = await saveFunnel(site, {
          steps: funnelConfig.steps,
          name: funnelConfig.name,
          reportId: funnelConfig.reportId,
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
