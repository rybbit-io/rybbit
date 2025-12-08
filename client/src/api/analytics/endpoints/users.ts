import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, SortParams, toQueryParams } from "./types";
import type { GetSessionsResponse } from "./sessions";

// User response type
export type UsersResponse = {
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified, empty string otherwise
  traits: Record<string, unknown> | null;
  country: string;
  region: string;
  city: string;
  language: string;
  browser: string;
  operating_system: string;
  device_type: string;
  referrer: string;
  channel: string;
  pageviews: number;
  events: number;
  sessions: number;
  last_seen: string;
  first_seen: string;
};

// Linked device type
export type LinkedDevice = {
  anonymous_id: string;
  created_at: string;
};

// User info type
export type UserInfo = {
  duration: number;
  sessions: number;
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified, empty string otherwise
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_height: number;
  screen_width: number;
  last_seen: string;
  first_seen: string;
  pageviews: number;
  events: number;
  ip?: string;
  traits: Record<string, unknown> | null;
  linked_devices: LinkedDevice[];
};

// User session count response type
export interface UserSessionCountResponse {
  date: string;
  sessions: number;
}

export interface UsersParams extends CommonApiParams, PaginationParams, SortParams {
  pageSize?: number;
  identifiedOnly?: boolean;
}

export interface UserSessionsParams extends CommonApiParams {
  userId: string;
}

export interface UserSessionCountParams {
  userId: string;
  timeZone: string;
}

export interface UsersListResponse {
  data: UsersResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Fetch users list with pagination
 * GET /api/users/:site
 */
export async function fetchUsers(site: string | number, params: UsersParams): Promise<UsersListResponse> {
  const queryParams = {
    ...toQueryParams(params),
    page: params.page,
    page_size: params.pageSize ?? params.limit,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    identified_only: params.identifiedOnly,
  };

  const response = await authedFetch<UsersListResponse>(`/users/${site}`, queryParams);
  return response;
}

/**
 * Fetch session count per day for a user
 * GET /api/users/session-count/:site
 */
export async function fetchUserSessionCount(
  site: string | number,
  params: UserSessionCountParams
): Promise<{ data: UserSessionCountResponse[] }> {
  const response = await authedFetch<{ data: UserSessionCountResponse[] }>(`/users/session-count/${site}`, {
    user_id: params.userId,
    time_zone: params.timeZone,
  });
  return response;
}

/**
 * Fetch detailed user information
 * GET /api/users/:userId/:site
 */
export async function fetchUserInfo(site: string | number, userId: string): Promise<UserInfo> {
  const response = await authedFetch<{ data: UserInfo }>(`/users/${userId}/${site}`);
  return response.data;
}
