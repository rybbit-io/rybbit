import type { TimeBucket } from "./time";

export type DashboardVizType =
  | "table"
  | "line"
  | "area"
  | "bar"
  | "hbar"
  | "pie"
  | "stat"
  | "map"
  | "calendar";

/** How a single numeric value is formatted in stat / map / calendar cards. */
export type DashboardValueFormat = "number" | "percent" | "duration" | "bytes";

/**
 * Allowlisted bucket values for the {{bucket}} template variable. Mirrors the
 * server-side bucketIntervalMap keys (which are derived from TimeBucket).
 */
export type DashboardBucket = TimeBucket;

export interface DashboardCardMapping {
  /** Column used for the X axis / category (also the slice label for pie). */
  xColumn?: string;
  /** Numeric columns plotted on the Y axis. */
  yColumns?: string[];
  /** Optional column whose distinct values split the data into multiple series. */
  seriesColumn?: string;
  /** Single numeric value: stat figure, pie/bar-list/map/calendar magnitude. */
  valueColumn?: string;
  /** stat / map / calendar value formatting. */
  valueFormat?: DashboardValueFormat;
  /** map: column of ISO 3166-1 alpha-2 country codes (e.g. "US"). */
  countryColumn?: string;
  /** calendar: column of dates ("YYYY-MM-DD"). */
  dateColumn?: string;
}

export interface DashboardGridPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardCard {
  /** Client-generated unique id. */
  id: string;
  title: string;
  /** Embedded ClickHouse SQL, executed against scoped_events. */
  sql: string;
  vizType: DashboardVizType;
  mapping: DashboardCardMapping;
  gridPos: DashboardGridPos;
}

export interface DashboardConfig {
  cards: DashboardCard[];
}

export interface Dashboard {
  dashboardId: number;
  siteId: number;
  userId: string | null;
  name: string;
  config: DashboardConfig;
  createdAt: string;
  updatedAt: string;
}
