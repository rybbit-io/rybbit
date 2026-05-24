import { authedFetch } from "../../utils";
import { CommonApiParams, toQueryParams } from "./types";

// Heatmap data point type
export interface HeatmapDataPoint {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  value: number; // click count
}

// Click heatmap result type
export interface ClickHeatmapResult {
  points: HeatmapDataPoint[];
  totalClicks: number;
  uniqueSessions: number;
}

// Click heatmap response type
export interface ClickHeatmapResponse {
  data: ClickHeatmapResult;
  pathname: string;
}

// Heatmap page type
export interface HeatmapPage {
  pathname: string;
  clickCount: number;
  sessionCount: number;
}

// Heatmap pages response type
export interface HeatmapPagesResponse {
  data: HeatmapPage[];
}

// Viewport breakpoint type
export type ViewportBreakpoint = "mobile" | "tablet" | "desktop" | "all";

// Click heatmap params
export interface ClickHeatmapParams extends CommonApiParams {
  pathname: string;
  viewportBreakpoint?: ViewportBreakpoint;
  gridResolution?: number;
}

// Heatmap pages params
export interface HeatmapPagesParams extends CommonApiParams {
  limit?: number;
}

/**
 * Fetch click heatmap data for a specific page
 * GET /api/sites/:siteId/heatmap/clicks
 */
export async function fetchClickHeatmap(
  site: string | number,
  params: ClickHeatmapParams
): Promise<ClickHeatmapResponse> {
  const queryParams = {
    ...toQueryParams(params),
    pathname: params.pathname,
    viewportBreakpoint: params.viewportBreakpoint,
    gridResolution: params.gridResolution,
  };

  return authedFetch<ClickHeatmapResponse>(`/sites/${site}/heatmap/clicks`, queryParams);
}

/**
 * Fetch list of pages with click data for heatmaps
 * GET /api/sites/:siteId/heatmap/pages
 */
export async function fetchHeatmapPages(
  site: string | number,
  params: HeatmapPagesParams
): Promise<HeatmapPagesResponse> {
  const queryParams = {
    ...toQueryParams(params),
    limit: params.limit,
  };

  return authedFetch<HeatmapPagesResponse>(`/sites/${site}/heatmap/pages`, queryParams);
}
