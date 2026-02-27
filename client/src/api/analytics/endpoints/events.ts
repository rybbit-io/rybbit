import { Filter } from "@rybbit/shared";
import { authedFetch } from "../../utils";
import {
  BucketedParams,
  CommonApiParams,
  toBucketedQueryParams,
  toQueryParams,
} from "./types";

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

// Event property key-value pair
export type EventProperty = {
  propertyKey: string;
  propertyValue: string;
  count: number;
};

// Outbound link click data
export type OutboundLink = {
  url: string;
  count: number;
  lastClicked: string;
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
 * Poll for events newer than sinceTimestamp (Realtime mode).
 * Only sends filters — no time range.
 */
export async function fetchNewEvents(
  site: string | number,
  params: { sinceTimestamp: string; filters?: Filter[]; timeZone: string }
): Promise<NewEventsResponse> {
  const queryParams: Record<string, any> = {
    since_timestamp: params.sinceTimestamp,
    time_zone: params.timeZone,
    start_date: "",
    end_date: "",
  };
  if (params.filters?.length) {
    queryParams.filters = params.filters;
  }

  return authedFetch<NewEventsResponse>(
    `/sites/${site}/events`,
    queryParams
  );
}

/**
 * Cursor-based fetch for historical scrolling / initial load.
 */
export async function fetchEventsCursor(
  site: string | number,
  params: CommonApiParams & {
    beforeTimestamp?: string;
    pageSize?: number;
  }
): Promise<CursorEventsResponse> {
  const queryParams: Record<string, any> = {
    ...toQueryParams(params),
    page_size: params.pageSize ?? 50,
  };

  if (params.beforeTimestamp) {
    queryParams.before_timestamp = params.beforeTimestamp;
  }

  return authedFetch<CursorEventsResponse>(
    `/sites/${site}/events`,
    queryParams
  );
}

/**
 * Fetch event names
 * GET /api/events/names/:site
 */
export async function fetchEventNames(
  site: string | number,
  params: CommonApiParams
): Promise<EventName[]> {
  const response = await authedFetch<{ data: EventName[] }>(
    `/sites/${site}/events/names`,
    toQueryParams(params)
  );
  return response.data;
}

/**
 * Fetch event properties for a specific event name
 * GET /api/events/properties/:site
 */
export async function fetchEventProperties(
  site: string | number,
  params: EventPropertiesParams
): Promise<EventProperty[]> {
  const queryParams = {
    ...toQueryParams(params),
    event_name: params.eventName,
  };

  const response = await authedFetch<{ data: EventProperty[] }>(
    `/sites/${site}/events/properties`,
    queryParams
  );
  return response.data;
}

/**
 * Fetch outbound link clicks
 * GET /api/events/outbound/:site
 */
export async function fetchOutboundLinks(
  site: string | number,
  params: CommonApiParams
): Promise<OutboundLink[]> {
  const response = await authedFetch<{ data: OutboundLink[] }>(
    `/sites/${site}/events/outbound`,
    toQueryParams(params)
  );
  return response.data;
}

/**
 * Fetch bucketed event counts for top custom events
 * GET /sites/:site/events/bucketed
 */
export async function fetchEventBucketed(
  site: string | number,
  params: EventBucketedParams
): Promise<EventBucketedPoint[]> {
  const queryParams = {
    ...toBucketedQueryParams(params),
    limit: params.limit,
  };

  const response = await authedFetch<{ data: EventBucketedPoint[] }>(
    `/sites/${site}/events/bucketed`,
    queryParams
  );
  return response.data;
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
