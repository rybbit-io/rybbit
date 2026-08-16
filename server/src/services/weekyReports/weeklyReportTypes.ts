import type { BreakdownRow, OverviewRow } from "../siteMetrics/siteMetrics.js";

// The email renders exactly what the Site Metrics module returns; naming the
// rows here keeps the template's imports stable.
export type OverviewData = OverviewRow;
export type MetricData = BreakdownRow;

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
