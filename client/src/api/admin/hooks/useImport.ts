import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImportPlatform } from "@/types/import";
import { DEFAULT_EVENT_LIMIT } from "@/lib/subscription/constants";
import { IS_CLOUD } from "@/lib/const";
import { getSiteImports, createSiteImport, deleteSiteImport } from "../endpoints";
import { useCurrentSite } from "./useSites";

export function useGetSiteImports(site: number) {
  const { subscription } = useCurrentSite();

  const isFreeTier = IS_CLOUD && subscription?.eventLimit === DEFAULT_EVENT_LIMIT;

  return useQuery({
    queryKey: ["get-site-imports", site],
    queryFn: async () => await getSiteImports(site),
    refetchInterval: data => {
      const hasActiveImports = data.state.data?.data.some(imp => imp.completedAt === null);
      return hasActiveImports ? 5000 : false;
    },
    placeholderData: { data: [] },
    staleTime: 30000,
    enabled: !isFreeTier,
  });
}

export function useCreateSiteImport(site: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: ImportPlatform }) => {
      return await createSiteImport(site, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["get-site-imports", site],
      });
    },
    retry: false,
  });
}

export function useDeleteSiteImport(site: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      return await deleteSiteImport(site, importId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["get-site-imports", site],
      });
    },
    retry: false,
  });
}
