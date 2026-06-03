import type { TimeBucket } from "./time";

export type DashboardVizType = "table" | "line" | "bar";

/**
 * Allowlisted bucket values for the {{bucket}} template variable. Mirrors the
 * server-side bucketIntervalMap keys (which are derived from TimeBucket).
 */
export type DashboardBucket = TimeBucket;

export interface DashboardCardMapping {
  /** Column used for the X axis / category. */
  xColumn?: string;
  /** Numeric columns plotted on the Y axis. */
  yColumns?: string[];
  /** Optional column whose distinct values split the data into multiple series. */
  seriesColumn?: string;
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
