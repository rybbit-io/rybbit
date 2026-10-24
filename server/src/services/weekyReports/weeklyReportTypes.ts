import type { BreakdownRow, OverviewRow } from "../siteMetrics/siteMetrics.js";

// The email renders exactly what the Site Metrics module returns; naming the
// rows here keeps the template's imports stable.
export type OverviewData = OverviewRow;
export type MetricData = BreakdownRow;

/** One day of the reported week next to the same weekday a week earlier. */
export interface DailySessions {
  /** ISO date (UTC) of the day in the reported week. */
  date: string;
  sessions: number;
  previousSessions: number;
}

export interface SiteReport {
  siteId: number;
  siteName: string;
  siteDomain: string;
  /** ISO dates (UTC): the first and last day of the reported week. */
  weekStart: string;
  weekEnd: string;
  currentWeek: OverviewData;
  previousWeek: OverviewData;
  daily: DailySessions[];
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
