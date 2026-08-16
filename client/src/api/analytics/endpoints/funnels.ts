import type { AutocaptureTargetType } from "../../../lib/events";
import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams } from "./types";

// Funnel step types: page paths, custom events, and autocaptured event types
export type FunnelStepType = "page" | "event" | AutocaptureTargetType;

// Funnel step type
export type FunnelStep = {
  value: string;
  name?: string;
  type: FunnelStepType;
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

// Page and event steps need a value; autocapture steps may leave it empty to
// match any event of their type
export function stepRequiresValue(step: FunnelStep): boolean {
  return step.type === "page" || step.type === "event";
}

export function hasIncompleteSteps(steps: FunnelStep[]): boolean {
  return steps.some(step => stepRequiresValue(step) && !step.value);
}

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
  sessions: number;
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
