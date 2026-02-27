import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, toQueryParams } from "./types";
import type { GetSessionsResponse } from "./sessions";

// Funnel step type
export type FunnelStep = {
  value: string;
  name?: string;
  type: "page" | "event";
  hostname?: string;
  // Deprecated fields - kept for backwards compatibility
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
  // New field for multiple property filters
  propertyFilters?: Array<{
    key: string;
    value: string | number | boolean;
  }>;
};

// Funnel request type
export type FunnelRequest = {
  steps: FunnelStep[];
  name?: string;
};

// Save funnel request type
export type SaveFunnelRequest = {
  steps: FunnelStep[];
  name: string;
  reportId?: number;
};

// Funnel response type
export type FunnelResponse = {
  step_number: number;
  step_name: string;
  visitors: number;
  conversion_rate: number;
  dropoff_rate: number;
};

// Saved funnel type
export interface SavedFunnel {
  id: number;
  name: string;
  steps: FunnelStep[];
  createdAt: string;
  updatedAt: string;
  conversionRate: number | null;
  totalVisitors: number | null;
}

export interface AnalyzeFunnelParams extends CommonApiParams {
  steps: FunnelStep[];
  name?: string;
}

export interface FunnelStepSessionsParams extends CommonApiParams, PaginationParams {
  steps: FunnelStep[];
  stepNumber: number;
  mode: "reached" | "dropped";
}

export interface SaveFunnelParams {
  steps: FunnelStep[];
  name: string;
  reportId?: number;
}

/**
 * Fetch all saved funnels
 * GET /api/funnels/:site
 */
export async function fetchFunnels(
  site: string | number
): Promise<SavedFunnel[]> {
  const response = await authedFetch<{ data: SavedFunnel[] }>(
    `/sites/${site}/funnels`
  );
  return response.data;
}

/**
 * Analyze a funnel configuration
 * POST /api/funnels/analyze/:site
 */
export async function analyzeFunnel(
  site: string | number,
  params: AnalyzeFunnelParams
): Promise<FunnelResponse[]> {
  const queryParams = toQueryParams(params);

  const response = await authedFetch<{ data: FunnelResponse[] }>(
    `/sites/${site}/funnels/analyze`,
    queryParams,
    {
      method: "POST",
      data: {
        steps: params.steps,
        name: params.name,
      },
    }
  );
  return response.data;
}

/**
 * Get sessions at a specific funnel step
 * POST /api/funnels/:stepNumber/sessions/:site
 */
export async function fetchFunnelStepSessions(
  site: string | number,
  params: FunnelStepSessionsParams
): Promise<{ data: GetSessionsResponse }> {
  const queryParams = {
    ...toQueryParams(params),
    mode: params.mode,
    page: params.page,
    limit: params.limit,
  };

  const response = await authedFetch<{ data: GetSessionsResponse }>(
    `/sites/${site}/funnels/${params.stepNumber}/sessions`,
    queryParams,
    {
      method: "POST",
      data: { steps: params.steps },
    }
  );
  return response;
}

/**
 * Create or update a saved funnel
 * POST /api/funnels/:site
 */
export async function saveFunnel(
  site: string | number,
  params: SaveFunnelParams
): Promise<{ success: boolean; funnelId: number }> {
  const response = await authedFetch<{ success: boolean; funnelId: number }>(
    `/sites/${site}/funnels`,
    undefined,
    {
      method: "POST",
      data: params,
    }
  );
  return response;
}

/**
 * Delete a saved funnel
 * DELETE /api/funnels/:funnelId/:site
 */
export async function deleteFunnel(
  site: string | number,
  funnelId: number
): Promise<{ success: boolean }> {
  const response = await authedFetch<{ success: boolean }>(
    `/sites/${site}/funnels/${funnelId}`,
    undefined,
    {
      method: "DELETE",
    }
  );
  return response;
}
