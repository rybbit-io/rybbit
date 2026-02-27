import { useMutation, useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { authClient } from "../../../lib/auth";
import { useStore } from "../../../lib/store";
import {
  fetchSite,
  fetchSiteHasData,
  fetchSiteIsPublic,
  fetchSitesFromOrg,
  GetSitesFromOrgResponse,
  verifyScript,
  VerifyScriptResponse
} from "../endpoints";

export function useGetSitesFromOrg(organizationId?: string) {
  return useQuery<GetSitesFromOrgResponse>({
    queryKey: ["get-sites-from-org", organizationId],
    queryFn: () => {
      return fetchSitesFromOrg(organizationId!);
    },
    staleTime: 60000, // 1 minute
    enabled: !!organizationId,
  });
}

export function useSiteHasData(siteId: string) {
  return useQuery({
    queryKey: ["site-has-data", siteId],
    queryFn: () => {
      if (!siteId) {
        return Promise.resolve(false);
      }
      return fetchSiteHasData(siteId).then(data => data.hasData);
    },
    refetchInterval: 5000,
    staleTime: Infinity,
  });
}

export function useGetSite(siteId?: string | number) {
  const { site: storeSelectedSite } = useStore();

  const siteIdToUse = siteId ?? storeSelectedSite;

  return useQuery({
    queryKey: ["get-site", siteIdToUse],
    queryFn: async () => {
      if (!siteIdToUse) {
        return null;
      }

      const data = await fetchSite(siteIdToUse);
      return data;
    },
    staleTime: 60000,
    enabled: !!siteIdToUse,
  });
}

export function useGetSiteIsPublic(siteId?: string | number) {
  return useQuery({
    queryKey: ["site-is-public", siteId],
    queryFn: async () => {
      if (!siteId) {
        return false;
      }

      try {
        const data = await fetchSiteIsPublic(siteId);
        return !!data.isPublic;
      } catch (error) {
        console.error("Error checking if site is public:", error);
        return false;
      }
    },
    staleTime: 60000,
    enabled: !!siteId,
  });
}

export function useVerifyScript() {
  return useMutation<VerifyScriptResponse, Error, number | string>({
    mutationFn: (siteId: number | string) => verifyScript(siteId),
  });
}

export const useCurrentSite = () => {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sites } = useGetSitesFromOrg(activeOrganization?.id);
  const pathname = usePathname();

  return {
    site: sites?.sites.find(site => site.siteId === Number(pathname.split("/")[1])),
    subscription: sites?.subscription,
  };
};
