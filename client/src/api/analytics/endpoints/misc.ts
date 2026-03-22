import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, toQueryParams } from "./types";

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
  value: string; // The page_title
  pathname: string; // A representative pathname
  count: number;
  percentage: number;
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

/**
 * Fetch retention cohort data
 * GET /api/retention/:site
 */
export async function fetchRetention(
  site: string | number,
  params: RetentionParams = {}
): Promise<ProcessedRetentionData> {
  const { mode = "week", range = 90 } = params;

  const response = await authedFetch<{ data: ProcessedRetentionData }>(
    `/sites/${site}/retention`,
    { mode, range }
  );
  return response.data;
}

/**
 * Fetch user journey paths
 * GET /api/journeys/:site
 */
export async function fetchJourneys(
  site: string | number,
  params: JourneysParams
): Promise<JourneysResponse> {
  const queryParams = {
    ...toQueryParams(params),
    steps: params.steps ?? 3,
    limit: params.limit ?? 100,
    stepFilters:
      params.stepFilters && Object.keys(params.stepFilters).length > 0
        ? JSON.stringify(params.stepFilters)
        : undefined,
  };

  const response = await authedFetch<JourneysResponse>(
    `/sites/${site}/journeys`,
    queryParams
  );
  return response;
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
 * Fetch page titles with pagination
 * GET /api/page-titles/:site
 */
export async function fetchPageTitles(
  site: string | number,
  params: PageTitlesParams
): Promise<PageTitlesPaginatedResponse> {
  const queryParams = {
    ...toQueryParams(params),
    limit: params.limit,
    page: params.page,
  };

  const response = await authedFetch<{ data: PageTitlesPaginatedResponse }>(
    `/sites/${site}/page-titles`,
    queryParams
  );
  return response.data;
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
