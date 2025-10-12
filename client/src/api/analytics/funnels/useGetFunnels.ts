import { Filter } from "@rybbit/shared";
import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../../utils";
import { FunnelStep } from "./useGetFunnel";

export interface SavedFunnel {
  id: number;
  name: string;
  steps: FunnelStep[];
  createdAt: string;
  updatedAt: string;
  conversionRate: number | null;
  totalVisitors: number | null;
}

export function useGetFunnels(siteId?: string | number) {
  return useQuery<SavedFunnel[]>({
    queryKey: ["funnels", siteId],
    queryFn: async () => {
      if (!siteId) {
        return [];
      }
      try {
        const response = await authedFetch<{ data: SavedFunnel[] }>(`/funnels/${siteId}`);
        return response.data;
      } catch (error) {
        throw new Error("Failed to fetch funnels");
      }
    },
    enabled: !!siteId,
  });
}
