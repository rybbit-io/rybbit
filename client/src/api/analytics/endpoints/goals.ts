import type { AutocaptureTargetType } from "../../../lib/events";
import { authedFetch } from "../../utils";
import { BucketedParams, CommonApiParams, PaginationParams, SortParams } from "./types";

// Goal types: page paths, custom events, and autocaptured event types
export type GoalType = "path" | "event" | AutocaptureTargetType;

export interface GoalConfig {
  pathPattern?: string;
  eventName?: string;
  // Optional wildcard pattern for autocapture goals (URL, button text, form name/id, copied text)
  valuePattern?: string;
  // Deprecated fields - kept for backwards compatibility
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
  // New field for multiple property filters
  propertyFilters?: Array<{
    key: string;
    value: string | number | boolean;
  }>;
}

// Goal type
export interface Goal {
  goalId: number;
  name: string | null;
  goalType: GoalType;
  config: GoalConfig;
  createdAt: string;
  total_conversions: number;
  total_sessions: number;
  conversion_rate: number;
}

// Pagination meta type
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Goals response type
export interface GoalsResponse {
  data: Goal[];
  meta: PaginationMeta;
}

export interface GoalTimeSeriesPoint {
  time: string;
  goal_id: number;
  conversions: number;
  total_sessions: number;
  conversion_rate: number;
}

/**
 * Every goal of the site (up to the server's bound) with its conversions in
 * the window, most conversions first, plus the totals the summary band shows.
 */
export interface GoalsSummary {
  goals: Goal[];
  total_sessions: number;
  /** Sessions that completed at least one goal. */
  converting_sessions: number;
  /** Goals the site has; larger than `goals.length` when the bound was hit. */
  total_goals: number;
}

/** A goal before it is saved: its type and what it matches. */
export interface GoalDefinition {
  goalType: GoalType;
  config: GoalConfig;
}

/** What an unsaved goal would have counted in the window. */
export interface GoalPreview {
  conversions: number;
  total_sessions: number;
  conversion_rate: number;
  series: { time: string; conversions: number }[];
}

export interface GoalsParams extends CommonApiParams, PaginationParams, SortParams {
  pageSize?: number;
  sort?: "goalId" | "name" | "goalType" | "createdAt";
  order?: "asc" | "desc";
}

export interface GoalTimeSeriesParams extends BucketedParams {
  goalIds: number[];
}

export interface GoalSessionsParams extends CommonApiParams, PaginationParams {
  goalId: number;
}

export interface CreateGoalParams {
  name?: string;
  goalType: GoalType;
  config: GoalConfig;
}

export interface UpdateGoalParams extends CreateGoalParams {
  goalId: number;
  siteId: number;
}

/**
 * Create a new goal
 * POST /api/goals/:site
 */
export async function createGoal(
  site: string | number,
  params: CreateGoalParams
): Promise<{ success: boolean; goalId: number }> {
  const response = await authedFetch<{ success: boolean; goalId: number }>(`/sites/${site}/goals`, undefined, {
    method: "POST",
    data: params,
  });
  return response;
}

/**
 * Update an existing goal
 * PUT /api/goals/:goalId/:site
 */
export async function updateGoal(
  site: string | number,
  params: UpdateGoalParams
): Promise<{ success: boolean; goalId: number }> {
  const response = await authedFetch<{ success: boolean; goalId: number }>(
    `/sites/${site}/goals/${params.goalId}`,
    undefined,
    {
      method: "PUT",
      data: params,
    }
  );
  return response;
}

/**
 * Delete a goal
 * DELETE /api/goals/:goalId/:site
 */
export async function deleteGoal(site: string | number, goalId: number): Promise<{ success: boolean }> {
  const response = await authedFetch<{ success: boolean }>(`/sites/${site}/goals/${goalId}`, undefined, {
    method: "DELETE",
  });
  return response;
}
