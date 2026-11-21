import { authedFetch } from "../../utils";
import { CommonApiParams, PaginationParams, toQueryParams } from "./types";

// A goal a session or one of its events completed. `name` is null for an
// unnamed goal.
export interface SessionGoal {
  id: number;
  name: string | null;
}

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
  button_clicks: number;
  copies: number;
  form_submits: number;
  input_changes: number;
  ip: string;
  lat: number;
  lon: number;
  has_replay: number;
  // Goals the session completed, the most recent conversion first. Only the
  // sessions list returns it, and only when asked to (include_goals).
  converted_goals?: SessionGoal[];
}[];

// The saved views of the Sessions page
export type SessionView = "all" | "identified" | "replay" | "converted" | "bounced" | "errors";

export type SessionSort = "started" | "ended" | "duration" | "pageviews" | "events" | "errors";

// How many sessions each view holds. `converted` is null on a site with no goals.
export type SessionViewCounts = Record<Exclude<SessionView, "converted">, number> & { converted: number | null };

// Sessions summary response type
export interface SessionsSummary {
  // The period at a glance, whatever the pageview/event/duration ranges are set to
  sessions: number;
  session_duration: number;
  pages_per_session: number;
  bounce_rate: number;
  converted: number | null;
  with_errors: number;
  // The same sessions narrowed by the ranges, per view
  matching: SessionViewCounts;
  // `matching` by the day each session started (YYYY-MM-DD in the request's timezone), newest first
  days: ({ day: string } & SessionViewCounts)[];
}

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
  session_duration: number;
  pageviews: number;
  events: number;
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
  // Goals this event completed
  goals?: SessionGoal[];
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
  sessionId?: string;
  identifiedOnly?: boolean;
  minPageviews?: number;
  maxPageviews?: number;
  minEvents?: number;
  maxEvents?: number;
  minDuration?: number;
  maxDuration?: number;
  view?: SessionView;
  sortBy?: SessionSort;
  sortOrder?: "asc" | "desc";
  includeGoals?: boolean;
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
    session_id: params.sessionId,
    identified_only: params.identifiedOnly,
    min_pageviews: params.minPageviews,
    max_pageviews: params.maxPageviews,
    min_events: params.minEvents,
    max_events: params.maxEvents,
    min_duration: params.minDuration,
    max_duration: params.maxDuration,
    view: params.view,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    include_goals: params.includeGoals || undefined,
  };

  const response = await authedFetch<{ data: GetSessionsResponse }>(
    `/sites/${site}/sessions`,
    queryParams
  );
  return response;
}
