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

/** One site's line in the weekly digest. */
export interface DigestSite {
  siteId: number;
  siteDomain: string;
  organizationId: string;
  organizationName: string;
  users: number;
  previousUsers: number;
  /** Sessions per UTC day of the reported week, first day first. */
  daily: number[];
  /** Set when the site had pageviews the week before but none last week: its last pageview. */
  lastPageviewAt: string | null;
}

/** Everyone with more than one site gets one email for all of them instead of one per site. */
export interface WeeklyDigest {
  /** ISO dates (UTC): the first and last day of the reported week. */
  weekStart: string;
  weekEnd: string;
  sites: DigestSite[];
}
