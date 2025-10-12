export interface OverviewData {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number | null;
  bounce_rate: number | null;
  session_duration: number;
}

export interface SingleColData {
  value: string;
  count: number;
  percentage: number | null;
}

export interface SiteReport {
  siteId: number;
  siteName: string;
  siteDomain: string;
  currentWeek: OverviewData;
  previousWeek: OverviewData;
  topCountries: SingleColData[];
  topPages: SingleColData[];
  topReferrers: SingleColData[];
  deviceBreakdown: SingleColData[];
}

export interface OrganizationReport {
  organizationId: string;
  organizationName: string;
  sites: SiteReport[];
}
