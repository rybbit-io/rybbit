import type { Filter } from "@rybbit/shared";
import type { BreakdownRow, OverviewRow } from "../siteMetrics/siteMetrics.js";

// The report renders exactly what the Site Metrics module returns; naming the
// rows here keeps the template's imports stable.
export type OverviewData = OverviewRow;
export type MetricData = BreakdownRow;

export interface ChartDataPoint {
  time: string;
  sessions: number;
  pageviews: number;
}

export interface PdfReportParams {
  siteId: number;
  startDate: string;
  endDate: string;
  timeZone: string;
  filters?: Filter[];
}

export interface PdfReportData {
  siteId: number;
  siteName: string;
  siteDomain: string;
  startDate: string;
  endDate: string;
  timeZone: string;
  generatedAt: string;
  overview: OverviewData;
  previousOverview: OverviewData | null;
  chartData: ChartDataPoint[];
  topCountries: MetricData[];
  topRegions: MetricData[];
  topCities: MetricData[];
  topPages: MetricData[];
  topReferrers: MetricData[];
  deviceBreakdown: MetricData[];
  topBrowsers: MetricData[];
  topOperatingSystems: MetricData[];
}
