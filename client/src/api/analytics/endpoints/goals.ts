import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, SortParams, toQueryParams } from "./types";
import type { GetSessionsResponse } from "./sessions";

// Goal type
export interface Goal {
  goalId: number;
  name: string | null;
  goalType: "path" | "event";
  config: {
    pathPattern?: string;
    eventName?: string;
    eventPropertyKey?: string;
    eventPropertyValue?: string | number | boolean;
  };
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

export interface GoalsParams extends CommonApiParams, PaginationParams, SortParams {
  pageSize?: number;
  sort?: "goalId" | "name" | "goalType" | "createdAt";
  order?: "asc" | "desc";
}

export interface GoalSessionsParams extends CommonApiParams, PaginationParams {
  goalId: number;
}

export interface CreateGoalParams {
  name?: string;
  goalType: "path" | "event";
  config: {
    pathPattern?: string;
    eventName?: string;
    eventPropertyKey?: string;
    eventPropertyValue?: string | number | boolean;
  };
}

export interface UpdateGoalParams extends CreateGoalParams {
  goalId: number;
}

/**
 * Fetch goals with pagination
 * GET /api/goals/:site
 */
export async function fetchGoals(
  site: string | number,
  params: GoalsParams
): Promise<GoalsResponse> {
  const queryParams = {
    ...toQueryParams(params),
    page: params.page,
    page_size: params.pageSize ?? params.limit,
    sort: params.sort,
    order: params.order,
  };

  const response = await authedFetch<GoalsResponse>(`/goals/${site}`, queryParams);
  return response;
}

/**
 * Fetch sessions that completed a goal
 * GET /api/goals/:goalId/sessions/:site
 */
export async function fetchGoalSessions(
  site: string | number,
  params: GoalSessionsParams
): Promise<{ data: GetSessionsResponse }> {
  const queryParams = {
    ...toQueryParams(params),
    page: params.page,
    limit: params.limit,
  };

  const response = await authedFetch<{ data: GetSessionsResponse }>(
    `/goals/${params.goalId}/sessions/${site}`,
    queryParams
  );
  return response;
}

/**
 * Create a new goal
 * POST /api/goals/:site
 */
export async function createGoal(
  site: string | number,
  params: CreateGoalParams
): Promise<{ success: boolean; goalId: number }> {
  const response = await authedFetch<{ success: boolean; goalId: number }>(
    `/goals/${site}`,
    undefined,
    {
      method: "POST",
      data: params,
    }
  );
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
    `/goals/${params.goalId}/${site}`,
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
export async function deleteGoal(
  site: string | number,
  goalId: number
): Promise<{ success: boolean }> {
  const response = await authedFetch<{ success: boolean }>(
    `/goals/${goalId}/${site}`,
    undefined,
    {
      method: "DELETE",
    }
  );
  return response;
}
