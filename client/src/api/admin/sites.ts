import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../../lib/const";
import { useStore } from "../../lib/store";
import { authedFetchWithError } from "../utils";
import { usePathname } from "next/navigation";
import { authClient } from "../../lib/auth";

export type SiteResponse = {
  siteId: number;
  name: string;
  domains: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId: string | null;
  public: boolean;
  saltUserIds: boolean;
  blockBots: boolean;
  isOwner: boolean;
};

export type GetSitesResponse = {
  siteId: number;
  name: string;
  domains: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  public: boolean;
  saltUserIds: boolean;
  blockBots: boolean;
  overMonthlyLimit?: boolean;
  monthlyEventCount?: number;
  eventLimit?: number;
  isOwner?: boolean;
}[];

export type GetSitesFromOrgResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: string;
    metadata: string | null;
    stripeCustomerId: string | null;
    monthlyEventCount: number | null;
    overMonthlyLimit: boolean | null;
  } | null;
  sites: Array<{
    siteId: number;
    name: string;
    domains: string[];
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    organizationId: string | null;
    public: boolean | null;
    saltUserIds: boolean | null;
    blockBots: boolean;
    sessionsLast24Hours: number;
    isOwner: boolean;
  }>;
  subscription: {
    monthlyEventCount: number;
    eventLimit: number;
    overMonthlyLimit: boolean;
    planName: string;
    status: string;
  };
};

export function useGetSitesFromOrg(organizationId?: string) {
  return useQuery<GetSitesFromOrgResponse>({
    queryKey: ["get-sites-from-org", organizationId],
    queryFn: () => {
      return authedFetchWithError(
        `${BACKEND_URL}/get-sites-from-org/${organizationId}`
      );
    },
    staleTime: 60000, // 1 minute
    enabled: !!organizationId,
  });
}

export function addSite(
  domains: string,
  name: string,
  organizationId: string,
  settings?: {
    isPublic?: boolean;
    saltUserIds?: boolean;
    blockBots?: boolean;
  }
) {
  return authedFetchWithError<{ siteId: number }>(`${BACKEND_URL}/add-site`, {
    method: "POST",
    body: JSON.stringify({
      domains,
      name,
      organizationId,
      public: settings?.isPublic || false,
      saltUserIds: settings?.saltUserIds || false,
      blockBots: settings?.blockBots === undefined ? true : settings?.blockBots,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function deleteSite(siteId: number) {
  return authedFetchWithError(`${BACKEND_URL}/delete-site/${siteId}`, {
    method: "POST",
  });
}

export function changeSiteDomain(siteId: number, newDomains: string) {
  return authedFetchWithError(`${BACKEND_URL}/change-site-domain`, {
    method: "POST",
    body: JSON.stringify({
      siteId,
      newDomains,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function changeSitePublic(siteId: number, isPublic: boolean) {
  return authedFetchWithError(`${BACKEND_URL}/change-site-public`, {
    method: "POST",
    body: JSON.stringify({
      siteId,
      isPublic,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function useSiteHasData(siteId: string) {
  return useQuery({
    queryKey: ["site-has-data", siteId],
    queryFn: () => {
      if (!siteId) {
        return Promise.resolve(false);
      }
      return authedFetchWithError<{ hasData: boolean }>(
        `${BACKEND_URL}/site-has-data/${siteId}`
      ).then((data) => data.hasData);
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

      // Use regular fetch instead of authedFetch to support public sites
      const data = await authedFetchWithError<SiteResponse>(
        `${BACKEND_URL}/get-site/${siteIdToUse}`
      );
      return data;
    },
    staleTime: 60000, // 1 minute
    enabled: !!siteId,
  });
}

export function changeSiteSalt(siteId: number, saltUserIds: boolean) {
  return authedFetchWithError(`${BACKEND_URL}/change-site-salt`, {
    method: "POST",
    body: JSON.stringify({
      siteId,
      saltUserIds,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function changeSiteBlockBots(siteId: number, blockBots: boolean) {
  return authedFetchWithError(`${BACKEND_URL}/change-site-block-bots`, {
    method: "POST",
    body: JSON.stringify({
      siteId,
      blockBots,
    }),
    headers: {
      "Content-Type": "application/json",
    },
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
        const response = await fetch(`${BACKEND_URL}/site-is-public/${siteId}`);
        if (response.ok) {
          const data = await response.json();
          return !!data.isPublic;
        }
      } catch (error) {
        console.error("Error checking if site is public:", error);
      }
      return false;
    },
    staleTime: 60000, // 1 minute
    enabled: !!siteId,
  });
}

export const useCurrentSite = () => {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sites } = useGetSitesFromOrg(activeOrganization?.id);
  const pathname = usePathname();

  return {
    site: sites?.sites.find(
      (site) => site.siteId === Number(pathname.split("/")[1])
    ),
    subscription: sites?.subscription,
  };
};
