import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../lib/store";
import { authedFetch } from "../utils";
import { usePathname } from "next/navigation";
import { authClient } from "../../lib/auth";

export type SiteResponse = {
  id: string | null;
  siteId: number;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId: string | null;
  public: boolean;
  saltUserIds: boolean;
  blockBots: boolean;
  isOwner: boolean;
  // Analytics features
  sessionReplay?: boolean;
  webVitals?: boolean;
  trackErrors?: boolean;
  trackOutbound?: boolean;
  trackUrlParams?: boolean;
  trackInitialPageView?: boolean;
  trackSpaNavigation?: boolean;
  trackIp?: boolean;
};

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
    id: string | null;
    siteId: number;
    name: string;
    domain: string;
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
    isPro: boolean;
  };
};

export function useGetSitesFromOrg(organizationId?: string) {
  return useQuery<GetSitesFromOrgResponse>({
    queryKey: ["get-sites-from-org", organizationId],
    queryFn: () => {
      return authedFetch(`/get-sites-from-org/${organizationId}`);
    },
    staleTime: 60000, // 1 minute
    enabled: !!organizationId,
  });
}

export function addSite(
  domain: string,
  name: string,
  organizationId: string,
  settings?: {
    isPublic?: boolean;
    saltUserIds?: boolean;
    blockBots?: boolean;
  }
) {
  return authedFetch<{ siteId: number }>("/add-site", undefined, {
    method: "POST",
    data: {
      domain,
      name,
      organizationId,
      public: settings?.isPublic || false,
      saltUserIds: settings?.saltUserIds || false,
      blockBots: settings?.blockBots === undefined ? true : settings?.blockBots,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function deleteSite(siteId: number) {
  return authedFetch(`/delete-site/${siteId}`, undefined, {
    method: "POST",
  });
}

// Consolidated function to update any site configuration
export function updateSiteConfig(
  siteId: number,
  config: {
    domain?: string;
    public?: boolean;
    saltUserIds?: boolean;
    blockBots?: boolean;
    excludedIPs?: string[];
    excludedCountries?: string[];
    sessionReplay?: boolean;
    webVitals?: boolean;
    trackErrors?: boolean;
    trackOutbound?: boolean;
    trackUrlParams?: boolean;
    trackInitialPageView?: boolean;
    trackSpaNavigation?: boolean;
  }
) {
  return authedFetch("/update-site-config", undefined, {
    method: "POST",
    data: {
      siteId,
      ...config,
    },
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
      return authedFetch<{ hasData: boolean }>(`/site-has-data/${siteId}`).then(data => data.hasData);
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
      const data = await authedFetch<SiteResponse>(`/get-site/${siteIdToUse}`);
      return data;
    },
    staleTime: 60000, // 1 minute
    enabled: !!siteId,
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
        const data = await authedFetch<{ isPublic: boolean }>(`/site-is-public/${siteId}`);
        return !!data.isPublic;
      } catch (error) {
        console.error("Error checking if site is public:", error);
        return false;
      }
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
    site: sites?.sites.find(site => site.siteId === Number(pathname.split("/")[1])),
    subscription: sites?.subscription,
  };
};
