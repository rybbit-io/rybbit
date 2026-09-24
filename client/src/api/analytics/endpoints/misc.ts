import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams } from "./types";

// Retention types
export interface ProcessedRetentionData {
  cohorts: Record<string, { size: number; percentages: (number | null)[] }>;
  maxPeriods: number;
  mode: "day" | "week";
  range: number;
}

export type RetentionMode = "day" | "week";

// Journey types
export interface Journey {
  path: string[];
  count: number;
  percentage: number;
}

export interface JourneysResponse {
  journeys: Journey[];
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

export type PageTitlesStandardResponse = PageTitleItem[];

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
