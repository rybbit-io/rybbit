import { Filter } from "@rybbit/shared";
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

// p75 Web Vitals across the user's performance events
export type UserVitals = {
  lcp_p75: number | null;
  cls_p75: number | null;
  inp_p75: number | null;
  fcp_p75: number | null;
  ttfb_p75: number | null;
  performance_events: number;
};

// One location the user was seen in, with session share
export type UserLocationBreakdown = {
  country: string;
  region: string;
  city: string;
  sessions: number;
  last_seen: string;
};

// One device the user was seen on (grouped without versions; versions and
// screen reflect the latest sighting)
export type UserDeviceBreakdown = {
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  sessions: number;
  last_seen: string;
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
  referrer: string;
  channel: string;
  last_seen: string;
  first_seen: string;
  pageviews: number;
  events: number;
  ip?: string;
  first_referrer: string;
  first_channel: string;
  first_entry_page: string;
  first_utm_source: string;
  first_utm_medium: string;
  first_utm_campaign: string;
  last_referrer: string;
  last_channel: string;
  timezone: string;
  traits: Record<string, unknown> | null;
  linked_devices: LinkedDevice[];
  vitals: UserVitals | null;
  locations: UserLocationBreakdown[];
  devices: UserDeviceBreakdown[];
};

// User session count response type
export interface UserSessionCountResponse {
  date: string;
  sessions: number;
}

export interface UsersParams extends CommonApiParams, PaginationParams, SortParams {
  pageSize?: number;
  identifiedOnly?: boolean;
  search?: string;
  searchField?: string;
}

export interface UserSessionsParams extends CommonApiParams {
  userId: string;
}

export interface UserSessionCountParams {
  userId: string;
  timeZone: string;
  filters?: Filter[];
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
    search: params.search || undefined,
    search_field: params.searchField || undefined,
  };

  const response = await authedFetch<UsersListResponse>(`/sites/${site}/users`, queryParams);
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
  const response = await authedFetch<{ data: UserSessionCountResponse[] }>(`/sites/${site}/users/session-count`, {
    user_id: params.userId,
    time_zone: params.timeZone,
    filters: params.filters?.length ? params.filters : undefined,
  });
  return response;
}

/**
 * Fetch detailed user information, optionally scoped to a time range and filters
 * GET /api/users/:userId/:site
 */
export async function fetchUserInfo(
  site: string | number,
  userId: string,
  params?: CommonApiParams
): Promise<UserInfo> {
  const response = await authedFetch<{ data: UserInfo }>(
    `/sites/${site}/users/${encodeURIComponent(userId)}`,
    params ? toQueryParams(params) : undefined
  );
  return response.data;
}

export interface IdentifyUserPayload {
  anonymousId: string;
  userId: string;
  traits?: Record<string, unknown>;
}

/**
 * Manually identify an anonymous visitor from the dashboard
 * POST /sites/:site/users/identify
 */
export async function identifyUser(site: string | number, payload: IdentifyUserPayload): Promise<{ success: boolean }> {
  return authedFetch<{ success: boolean }>(`/sites/${site}/users/identify`, undefined, {
    method: "POST",
    data: {
      anonymous_id: payload.anonymousId,
      user_id: payload.userId,
      traits: payload.traits,
    },
  });
}

/**
 * Replace an identified user's traits
 * PUT /sites/:site/users/:userId/traits
 */
export async function updateUserTraits(
  site: string | number,
  userId: string,
  traits: Record<string, unknown>
): Promise<{ success: boolean }> {
  return authedFetch<{ success: boolean }>(`/sites/${site}/users/${encodeURIComponent(userId)}/traits`, undefined, {
    method: "PUT",
    data: { traits },
  });
}

/**
 * Permanently delete all analytics data for a user (GDPR erasure)
 * DELETE /sites/:site/users/:userId
 */
export async function deleteUser(site: string | number, userId: string): Promise<{ success: boolean }> {
  return authedFetch<{ success: boolean }>(`/sites/${site}/users/${encodeURIComponent(userId)}`, undefined, {
    method: "DELETE",
  });
}
