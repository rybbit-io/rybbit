import type { Filter } from "@rybbit/shared";

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
