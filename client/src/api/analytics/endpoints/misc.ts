import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams } from "./types";

// Retention types
export interface ProcessedRetentionData {
  // Keyed by the cohort period's first day (YYYY-MM-DD); empty cohorts are left
  // out. `percentages` and `counts` are per period since the first visit, null
  // past the end of the window.
  cohorts: Record<string, { size: number; percentages: (number | null)[]; counts: (number | null)[] }>;
  maxPeriods: number;
  mode: "day" | "week";
  range: number;
  // Every cohort period in the window, oldest first.
  periods: string[];
  windowStart: string;
  windowEnd: string;
  timeZone: string;
  firstPeriodPartial: boolean;
  lastPeriodPartial: boolean;
  lastPeriodInProgress: boolean;
  truncated: boolean;
  lookbackDays: number;
}

export type RetentionMode = "day" | "week";

// Journey types
export interface Journey {
  path: string[];
  count: number;
  /** Share of the sessions with two or more pages, 0–100. */
  percentage: number;
  /** Sessions on this path that completed the requested goal; absent without a goal. */
  conversions?: number;
}

export interface JourneysResponse {
  journeys: Journey[];
  /** Sessions with two or more pages in the period, before any step filter. */
  totalSessions: number;
}

/** "section" collapses the pages under a first-level folder into one step, e.g. /docs/**. */
export type JourneyGrouping = "path" | "section";

export interface JourneySummary {
  /** Sessions that visited two or more pages. */
  sessions: number;
  avgPathLength: number;
  /** Null when no goal was requested. */
  conversions: number | null;
  topExit: { page: string; sessions: number } | null;
}

// Page title types
export type PageTitleItem = {
  value: string; // The page_title; empty when the row represents an untitled pathname
  pathname: string; // A representative pathname
  count: number;
  percentage: number;
  pageviews?: number;
  bounce_rate?: number;
  time_on_page_seconds?: number;
};

export type PageTitlesPaginatedResponse = {
  data: PageTitleItem[];
  totalCount: number;
};

// Org event count types
export type OrgEventCountResponse = {
  event_date: string;
  pageview_count: number;
  custom_event_count: number;
  performance_count: number;
  outbound_count: number;
  error_count: number;
  button_click_count: number;
  copy_count: number;
  form_submit_count: number;
  input_change_count: number;
  event_count: number;
}[];

export type GetOrgEventCountResponse = {
  data: OrgEventCountResponse;
};

export interface RetentionParams {
  mode?: RetentionMode;
  range?: number;
}

export interface JourneysParams extends CommonApiParams {
  steps?: number;
  limit?: number;
  stepFilters?: Record<number, string>;
}

export interface PageTitlesParams extends CommonApiParams, PaginationParams {
  useFilters?: boolean;
}

export interface OrgEventCountParams {
  startDate?: string;
  endDate?: string;
  timeZone?: string;
}

/**
 * Fetch organization event count
 * GET /api/org-event-count/:organizationId
 */
export async function fetchOrgEventCount(
  organizationId: string,
  params: OrgEventCountParams = {}
): Promise<GetOrgEventCountResponse> {
  const queryParams: Record<string, string> = {};
  if (params.startDate) queryParams.start_date = params.startDate;
  if (params.endDate) queryParams.end_date = params.endDate;
  if (params.timeZone) queryParams.time_zone = params.timeZone;

  const response = await authedFetch<GetOrgEventCountResponse>(
    `/org-event-count/${organizationId}`,
    queryParams
  );
  return response;
}
