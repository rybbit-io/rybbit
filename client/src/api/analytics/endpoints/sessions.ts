import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, toQueryParams } from "./types";

// Session response type
export type GetSessionsResponse = {
  session_id: string;
  user_id: string; // Device fingerprint
  identified_user_id: string; // Custom user ID when identified, empty string otherwise
  traits: Record<string, unknown> | null;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  referrer: string;
  channel: string;
  hostname: string;
  page_title: string;
  querystring: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  session_end: string;
  session_start: string;
  session_duration: number;
  entry_page: string;
  exit_page: string;
  pageviews: number;
  events: number;
  errors: number;
  outbound: number;
  ip: string;
  lat: number;
  lon: number;
  has_replay: number;
}[];

// Session details type
export interface SessionDetails {
  session_id: string;
  user_id: string;
  country: string;
  region: string;
  city: string;
  language: string;
  device_type: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  screen_width: number;
  screen_height: number;
  referrer: string;
  channel: string;
  session_end: string;
  session_start: string;
  pageviews: number;
  entry_page: string;
  exit_page: string;
  ip: string;
}

// Session event props type
export interface SessionEventProps {
  [key: string]: unknown;
  // Error-specific props
  message?: string;
  stack?: string;
}

// Session event type
export interface SessionEvent {
  timestamp: string;
  pathname: string;
  hostname: string;
  querystring: string;
  page_title: string;
  referrer: string;
  type: string;
  event_name?: string;
  props?: SessionEventProps;
}

// Session pageviews and events response
export interface SessionPageviewsAndEvents {
  session: SessionDetails;
  events: SessionEvent[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Live session location type (for map)
export type LiveSessionLocation = {
  lat: number;
  lon: number;
  count: number;
  city: string;
  country: string;
};

export interface SessionsParams extends CommonApiParams, PaginationParams {
  userId?: string;
  identifiedOnly?: boolean;
}

export interface SessionDetailsParams {
  sessionId: string;
  limit?: number;
  offset?: number;
  minutes?: number;
}

/**
 * Fetch sessions list
 * GET /api/sessions/:site
 */
export async function fetchSessions(
  site: string | number,
  params: SessionsParams
): Promise<{ data: GetSessionsResponse }> {
  const queryParams = {
    ...toQueryParams(params),
    page: params.page,
    limit: params.limit,
    user_id: params.userId,
    identified_only: params.identifiedOnly,
  };

  const response = await authedFetch<{ data: GetSessionsResponse }>(
    `/sessions/${site}`,
    queryParams
  );
  return response;
}

/**
 * Fetch details of a specific session
 * GET /api/sessions/:sessionId/:site
 */
export async function fetchSession(
  site: string | number,
  params: SessionDetailsParams
): Promise<{ data: SessionPageviewsAndEvents }> {
  const queryParams: Record<string, any> = {
    limit: params.limit,
    offset: params.offset,
  };

  if (params.minutes) {
    queryParams.minutes = params.minutes;
  }

  const response = await authedFetch<{ data: SessionPageviewsAndEvents }>(
    `/sessions/${params.sessionId}/${site}`,
    queryParams
  );
  return response;
}

/**
 * Fetch session locations for map visualization
 * GET /api/session-locations/:site
 */
export async function fetchSessionLocations(
  site: string | number,
  params: CommonApiParams
): Promise<LiveSessionLocation[]> {
  const response = await authedFetch<{ data: LiveSessionLocation[] }>(
    `/session-locations/${site}`,
    toQueryParams(params)
  );
  return response.data;
}
