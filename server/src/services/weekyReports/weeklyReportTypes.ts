export interface OverviewData {
  sessions: number;
  pageviews: number;
  users: number;
  pages_per_session: number | null;
  bounce_rate: number | null;
  session_duration: number;
}

export interface MetricData {
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
  topCountries: MetricData[];
  topPages: MetricData[];
  topReferrers: MetricData[];
  deviceBreakdown: MetricData[];
}

export interface OrganizationReport {
  organizationId: string;
  organizationName: string;
  sites: SiteReport[];
}
