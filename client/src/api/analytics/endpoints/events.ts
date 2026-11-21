import { authedFetch } from "../../utils";
import { BucketedParams, CommonApiParams, toBucketedQueryParams } from "./types";

// Event type
export type Event = {
  timestamp: string;
  event_name: string;
  properties: string;
  session_id: string;
  user_id: string;
  identified_user_id: string;
  hostname: string;
  pathname: string;
  querystring: string;
  page_title: string;
  referrer: string;
  browser: string;
  browser_version: string;
  operating_system: string;
  operating_system_version: string;
  language: string;
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  screen_width: number;
  screen_height: number;
  device_type: string;
  type: string;
  traits?: Record<string, unknown> | null;
};

// Response types for cursor-based API
export interface NewEventsResponse {
  data: Event[];
}

export interface CursorEventsResponse {
  data: Event[];
  cursor: { hasMore: boolean; oldestTimestamp: string | null };
}

// Event name with count
export type EventName = {
  eventName: string;
  count: number;
};

// One row of the events page's names table: count, users, last occurrence and
// the count per trend bucket (aligned to EventNameStats.buckets)
export type EventNameStat = {
  eventName: string;
  count: number;
  users: number;
  lastSeen: string;
  trend: number[];
};

export type EventTrendBucket = "hour" | "day" | "week" | "month";

export type EventNameStats = {
  // Bucket start times in the request's timezone, oldest first
  buckets: string[];
  events: EventNameStat[];
};

// The events page's stat band, for one period
export type EventsOverview = {
  events: number;
  users_with_events: number;
  users: number;
  sessions: number;
  sessions_with_events: number;
  event_names: number;
  autocaptured: number;
};

// A custom event that fired on most days and then stopped
export type SilentEvent = {
  eventName: string;
  lastSeen: string;
  total: number;
  activeDays: number;
  spanDays: number;
};

// Event property key-value pair
export type EventProperty = {
  propertyKey: string;
  propertyValue: string;
  count: number;
};

// Common value of an autocapture event type's primary props (used for suggestions)
export type AutocaptureValue = {
  value: string;
  count: number;
};

// Outbound link click data
export type OutboundLink = {
  url: string;
  count: number;
  lastClicked: string;
};

// Autocapture events (button clicks, form submissions, copies) grouped by
// their display value
export type AutocaptureEvent = {
  value: string;
  count: number;
  lastOccurred: string;
};

// Event counts over time
export type EventBucketedPoint = {
  time: string;
  event_name: string;
  event_count: number;
};

export interface EventBucketedParams extends BucketedParams {
  limit?: number;
}

// Site-level event count breakdown by type
export type SiteEventCountPoint = {
  time: string;
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
};

export type SiteEventCountParams = BucketedParams;

export interface EventPropertiesParams extends CommonApiParams {
  eventName: string;
}

/**
 * Fetch site-level event count breakdown by type
 * GET /sites/:site/events/count
 */
export async function fetchSiteEventCount(
  site: string | number,
  params: SiteEventCountParams
): Promise<SiteEventCountPoint[]> {
  const response = await authedFetch<{ data: SiteEventCountPoint[] }>(
    `/sites/${site}/events/count`,
    toBucketedQueryParams(params)
  );
  return response.data;
}
