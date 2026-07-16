import { authedFetch } from "../../utils";

export type SiteResponse = {
  id: string | null;
  siteId: number;
  name: string;
  type: "web" | "mobile" | null;
  domain: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId: string | null;
  public: boolean;
  embedEnabled?: boolean;
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
  trackButtonClicks?: boolean;
  trackCopy?: boolean;
  trackFormInteractions?: boolean;
  tags?: string[];
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
    type: "web" | "mobile" | null;
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
    tags?: string[] | null;
    teams?: { id: string; name: string }[];
  }>;
  subscription: {
    monthlyEventCount: number;
    eventLimit: number;
    overMonthlyLimit: boolean;
    planName: string;
    status: string;
  };
};

export function fetchSitesFromOrg(organizationId: string) {
  return authedFetch<GetSitesFromOrgResponse>(`/organizations/${organizationId}/sites`);
}

export function addSite(
  domain: string,
  name: string,
  organizationId: string,
  settings?: {
    type?: "web" | "mobile";
    isPublic?: boolean;
    saltUserIds?: boolean;
    blockBots?: boolean;
    sessionReplay?: boolean;
    webVitals?: boolean;
    trackErrors?: boolean;
    trackOutbound?: boolean;
    trackUrlParams?: boolean;
    trackInitialPageView?: boolean;
    trackSpaNavigation?: boolean;
    trackButtonClicks?: boolean;
    trackCopy?: boolean;
    trackFormInteractions?: boolean;
  }
) {
  // Undefined values are dropped from the JSON body, so the server falls back
  // to its column defaults for anything not explicitly chosen.
  return authedFetch<{ siteId: number }>(`/organizations/${organizationId}/sites`, undefined, {
    method: "POST",
    data: {
      domain,
      name,
      type: settings?.type || "web",
      public: settings?.isPublic || false,
      saltUserIds: settings?.saltUserIds || false,
      blockBots: settings?.blockBots === undefined ? true : settings?.blockBots,
      sessionReplay: settings?.sessionReplay,
      webVitals: settings?.webVitals,
      trackErrors: settings?.trackErrors,
      trackOutbound: settings?.trackOutbound,
      trackUrlParams: settings?.trackUrlParams,
      trackInitialPageView: settings?.trackInitialPageView,
      trackSpaNavigation: settings?.trackSpaNavigation,
      trackButtonClicks: settings?.trackButtonClicks,
      trackCopy: settings?.trackCopy,
      trackFormInteractions: settings?.trackFormInteractions,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function deleteSite(siteId: number) {
  return authedFetch(`/sites/${siteId}`, undefined, {
    method: "DELETE",
  });
}

export function moveSite(siteId: number, organizationId: string) {
  return authedFetch<{ success: boolean; organizationId: string }>(`/sites/${siteId}/move`, undefined, {
    method: "PUT",
    data: { organizationId },
  });
}

// Consolidated function to update any site configuration
export function updateSiteConfig(
  siteId: number,
  config: {
    name?: string;
    type?: "web" | "mobile" | null;
    domain?: string;
    public?: boolean;
    embedEnabled?: boolean;
    saltUserIds?: boolean;
    blockBots?: boolean;
    excludedIPs?: string[];
    excludedCountries?: string[];
    excludedPaths?: string[];
    excludedHostnames?: string[];
    excludedUserAgents?: string[];
    sessionReplay?: boolean;
    webVitals?: boolean;
    trackErrors?: boolean;
    trackOutbound?: boolean;
    trackUrlParams?: boolean;
    trackInitialPageView?: boolean;
    trackSpaNavigation?: boolean;
    trackIp?: boolean;
    trackButtonClicks?: boolean;
    trackCopy?: boolean;
    trackFormInteractions?: boolean;
    tags?: string[];
  }
) {
  return authedFetch(`/sites/${siteId}/config`, undefined, {
    method: "PUT",
    data: config,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function fetchSite(siteId: string | number) {
  return authedFetch<SiteResponse>(`/sites/${siteId}`);
}

export type SiteUsageResponse = {
  periodStart: string;
  daysInMonth: number;
  daysElapsed: number;
  siteEventsThisMonth: number;
  orgEventsThisMonth: number;
  /** null when self-hosted (no enforced limit) */
  orgEventLimit: number | null;
  /** Month-end projections from usage so far; null in the first day of the month */
  projectedSiteEvents: number | null;
  projectedOrgEvents: number | null;
};

export function fetchSiteUsage(siteId: number) {
  return authedFetch<SiteUsageResponse>(`/sites/${siteId}/usage`);
}

export function fetchSiteHasData(siteId: string) {
  return authedFetch<{ hasData: boolean }>(`/sites/${siteId}/has-data`);
}

export function fetchSiteIsPublic(siteId: string | number) {
  return authedFetch<{ isPublic: boolean }>(`/sites/${siteId}/is-public`);
}
